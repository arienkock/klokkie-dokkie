// Pure mastery-matrix logic for adaptive difficulty.
// See docs/adaptive-difficulty.md for the rules implemented here.

import {
  LADDERS, REPRESENTATIONS,
  randomMinutesFor, randomHour12, randomHour24, randomHourAny,
} from './concepts.js';

const FRONTIER_WINDOW_MAX = 8;
const REVIEW_WINDOW_MAX = 4;
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

const pick = (arr, rng) => arr[Math.floor(rng() * arr.length)];
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

export const frontierShare = (cell) =>
  isStruggling(cell) ? FRONTIER_SHARE_STRUGGLING : FRONTIER_SHARE;

// Record one answer into the matrix. Returns { matrix, events } where events
// may contain: { type: 'mastered' | 'demoted' | 'slipped', rep, conceptId, ... }.
// The input matrix is not mutated.
export const recordAnswer = (matrix, rep, conceptId, role, correct) => {
  const events = [];
  const next = structuredClone(matrix);
  const cell = next[rep][conceptId];

  if (role === 'frontier') {
    cell.window = [...cell.window, correct].slice(-FRONTIER_WINDOW_MAX);
    const recent = cell.window.slice(-PROMOTE_LOOKBACK);
    if (correct && recent.length >= PROMOTE_LOOKBACK && countCorrect(recent) >= PROMOTE_MIN_CORRECT) {
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
// selectedReps must contain at least two representations.
export const pickRound = (matrix, selectedReps, rng = Math.random) => {
  const editTarget = pick(selectedReps, rng);
  const refTarget = pick(selectedReps.filter(r => r !== editTarget), rng);

  // uur_24 exception: a reading skill, exercised with digital as the
  // reference and attributed to digital regardless of the edit target.
  if (editTarget === 'digital' && frontierFor(matrix, 'digital') === 'uur_24') {
    if (rng() < frontierShare(matrix.digital.uur_24)) {
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
    (reviewPool.length === 0 || rng() < frontierShare(matrix[editTarget][frontier]));

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
