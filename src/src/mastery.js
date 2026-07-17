// Pure mastery-matrix logic for adaptive difficulty.
// See docs/adaptive-difficulty.md for the rules implemented here.

import {
  LADDERS, REPRESENTATIONS,
  randomMinutesFor, randomHour12, randomHour24, randomHourAny,
} from './concepts.js';
import { pick } from './utils/random.js';

const FRONTIER_WINDOW_MAX = 8;
const REVIEW_WINDOW_MAX = 4;
const PROMOTE_STREAK = 3;
const PROMOTE_LOOKBACK = 5;
const PROMOTE_MIN_CORRECT = 4;
const DEMOTE_MIN_ANSWERS = 8;
const DEMOTE_MAX_CORRECT = 3;
const STRUGGLE_LOOKBACK = 4;
const STRUGGLE_MIN_WRONG = 3;
const SLIP_LOOKBACK = 4;
const SLIP_MIN_WRONG = 3;
const FRONTIER_SHARE = 0.5;
const FRONTIER_SHARE_STRUGGLING = 0.25;
const SESSION_LOOKBACK = 6;
const SESSION_MIN_ANSWERS = 4;
// Frontier share by wrong-answer count in the last SESSION_LOOKBACK session
// answers (counts past the last index use the last entry).
const SHARE_BY_SESSION_WRONG = [0.85, 0.5, 0.35, 0.2];

const countCorrect = arr => arr.filter(Boolean).length;
const countWrong = arr => arr.length - countCorrect(arr);

const freshCell = () => ({ mastered: false, window: [], review: [] });

export const createMatrix = () => Object.fromEntries(
  REPRESENTATIONS.map(rep => [
    rep,
    Object.fromEntries(LADDERS[rep].map(id => [id, freshCell()])),
  ])
);

// Merge a possibly stale/partial persisted matrix into a fresh one, keeping
// only cells that still exist and have the expected shape.
export const normalizeMatrix = (raw) => {
  const matrix = createMatrix();
  if (!raw || typeof raw !== 'object') return matrix;
  for (const rep of REPRESENTATIONS) {
    for (const id of LADDERS[rep]) {
      const cell = raw[rep]?.[id];
      if (!cell || typeof cell !== 'object') continue;
      matrix[rep][id] = {
        mastered: cell.mastered === true,
        window: Array.isArray(cell.window) ? cell.window.map(Boolean).slice(-FRONTIER_WINDOW_MAX) : [],
        review: Array.isArray(cell.review) ? cell.review.map(Boolean).slice(-REVIEW_WINDOW_MAX) : [],
      };
    }
  }
  return matrix;
};

export const frontierFor = (matrix, rep) =>
  LADDERS[rep].find(id => !matrix[rep][id].mastered) ?? null;

// Review pool: mastered rungs that generate their own minutes. uur_24 is
// excluded — once mastered it shows up as 13-23 hours on digital references
// instead of as a reviewable concept of its own.
export const masteredMinuteConcepts = (matrix, rep) =>
  LADDERS[rep].filter(id => id !== 'uur_24' && matrix[rep][id].mastered);

export const isStruggling = (cell) => {
  const recent = cell.window.slice(-STRUGGLE_LOOKBACK);
  return recent.length >= STRUGGLE_LOOKBACK && countWrong(recent) >= STRUGGLE_MIN_WRONG;
};

// Within-session controller: steer the frontier/review mix toward the ~80%
// success target from the current game's recent answers. Perfect recent play
// pushes the frontier hard; a rough patch backs off to mostly review.
export const sessionShare = (sessionResults = []) => {
  const recent = sessionResults.slice(-SESSION_LOOKBACK);
  if (recent.length < SESSION_MIN_ANSWERS) return FRONTIER_SHARE;
  return SHARE_BY_SESSION_WRONG[Math.min(countWrong(recent), SHARE_BY_SESSION_WRONG.length - 1)];
};

// The session controller sets the base share; a cell the child is actively
// struggling with is additionally floored down so that specific concept
// backs off even when the session as a whole is going fine.
export const frontierShare = (cell, sessionResults = []) => {
  const share = sessionShare(sessionResults);
  return isStruggling(cell) ? Math.min(share, FRONTIER_SHARE_STRUGGLING) : share;
};

// Record one answer into the matrix. Returns { matrix, events } where events
// may contain: { type: 'mastered' | 'demoted' | 'slipped', rep, conceptId, ... }.
// The input matrix is not mutated.
export const recordAnswer = (matrix, rep, conceptId, role, correct) => {
  // A stale frontier round (e.g. from the revisit queue) may arrive after
  // the concept was already mastered; never re-promote or demote from it.
  if (role === 'frontier' && matrix[rep][conceptId].mastered) {
    return { matrix, events: [] };
  }

  const events = [];
  const next = structuredClone(matrix);
  const cell = next[rep][conceptId];

  if (role === 'frontier') {
    cell.window = [...cell.window, correct].slice(-FRONTIER_WINDOW_MAX);
    const streak = cell.window.slice(-PROMOTE_STREAK);
    const recent = cell.window.slice(-PROMOTE_LOOKBACK);
    const promoted = correct && (
      (streak.length >= PROMOTE_STREAK && streak.every(Boolean)) ||
      (recent.length >= PROMOTE_LOOKBACK && countCorrect(recent) >= PROMOTE_MIN_CORRECT)
    );
    if (promoted) {
      next[rep][conceptId] = { ...freshCell(), mastered: true };
      events.push({ type: 'mastered', rep, conceptId });
    } else if (!correct && cell.window.length >= DEMOTE_MIN_ANSWERS && countCorrect(cell.window) <= DEMOTE_MAX_CORRECT) {
      cell.window = [];
      const ladder = LADDERS[rep];
      const below = ladder.slice(0, ladder.indexOf(conceptId)).reverse()
        .find(id => next[rep][id].mastered);
      if (below) {
        next[rep][below] = freshCell();
        events.push({ type: 'demoted', rep, conceptId, to: below });
      }
    }
  } else {
    cell.review = [...cell.review, correct].slice(-REVIEW_WINDOW_MAX);
    const recent = cell.review.slice(-SLIP_LOOKBACK);
    if (!correct && recent.length >= SLIP_LOOKBACK && countWrong(recent) >= SLIP_MIN_WRONG) {
      next[rep][conceptId] = freshCell();
      events.push({ type: 'slipped', rep, conceptId });
    }
  }

  return { matrix: next, events };
};

// Hours 13-23 may appear on a digital reference once uur_24 is mastered.
const hourFor = (refTarget, matrix, rng) =>
  refTarget === 'digital' && matrix.digital.uur_24.mastered
    ? randomHourAny(rng)
    : randomHour12(rng);

const reviewRound = (matrix, editTarget, refTarget, rng) => {
  const conceptId = pick(masteredMinuteConcepts(matrix, editTarget), rng);
  return {
    editTarget, refTarget,
    attributionRep: editTarget,
    conceptId,
    minuteConceptId: conceptId,
    role: 'review',
    time: { hours: hourFor(refTarget, matrix, rng), minutes: randomMinutesFor(conceptId, rng) },
  };
};

// Pick the next round: representations, concept, role and a concrete time.
// selectedReps must contain at least two representations. sessionResults is
// the current game's answer history, steering the frontier/review mix.
export const pickRound = (matrix, selectedReps, rng = Math.random, sessionResults = []) => {
  const editTarget = pick(selectedReps, rng);
  const refTarget = pick(selectedReps.filter(r => r !== editTarget), rng);

  // uur_24 exception: a reading skill, exercised with digital as the
  // reference and attributed to digital regardless of the edit target.
  if (editTarget === 'digital' && frontierFor(matrix, 'digital') === 'uur_24') {
    if (rng() < frontierShare(matrix.digital.uur_24, sessionResults)) {
      const newEdit = pick(selectedReps.filter(r => r !== 'digital'), rng);
      const minuteConceptId = pick(masteredMinuteConcepts(matrix, 'digital'), rng);
      return {
        editTarget: newEdit,
        refTarget: 'digital',
        attributionRep: 'digital',
        conceptId: 'uur_24',
        minuteConceptId,
        role: 'frontier',
        time: { hours: randomHour24(rng), minutes: randomMinutesFor(minuteConceptId, rng) },
      };
    }
    return reviewRound(matrix, editTarget, refTarget, rng);
  }

  const frontier = frontierFor(matrix, editTarget);
  const reviewPool = masteredMinuteConcepts(matrix, editTarget);
  const wantFrontier = frontier !== null &&
    (reviewPool.length === 0 || rng() < frontierShare(matrix[editTarget][frontier], sessionResults));

  if (!wantFrontier) return reviewRound(matrix, editTarget, refTarget, rng);

  return {
    editTarget, refTarget,
    attributionRep: editTarget,
    conceptId: frontier,
    minuteConceptId: frontier,
    role: 'frontier',
    time: { hours: hourFor(refTarget, matrix, rng), minutes: randomMinutesFor(frontier, rng) },
  };
};
