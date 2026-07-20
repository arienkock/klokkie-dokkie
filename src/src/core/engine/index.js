// Generic, domain-agnostic adaptive mastery-matrix engine.
// All ladder/track knowledge comes from `config`; nothing here imports from
// domains/ or concepts.js. See docs/adaptive-difficulty.md for the rules.

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

// config = { tracks: [{ id, ladder }, …] } where ladder is an ordered array of
// rung ids. Returns pure functions operating on a mastery matrix.
export const createAdaptiveEngine = (config) => {
  const tracks = config.tracks.map(t => t.id);
  const ladders = Object.fromEntries(config.tracks.map(t => [t.id, t.ladder]));

  const createMatrix = () => Object.fromEntries(
    tracks.map(track => [
      track,
      Object.fromEntries(ladders[track].map(id => [id, freshCell()])),
    ])
  );

  // Merge a possibly stale/partial persisted matrix into a fresh one, keeping
  // only cells that still exist and have the expected shape.
  const normalizeMatrix = (raw) => {
    const matrix = createMatrix();
    if (!raw || typeof raw !== 'object') return matrix;
    for (const track of tracks) {
      for (const id of ladders[track]) {
        const cell = raw[track]?.[id];
        if (!cell || typeof cell !== 'object') continue;
        matrix[track][id] = {
          mastered: cell.mastered === true,
          window: Array.isArray(cell.window) ? cell.window.map(Boolean).slice(-FRONTIER_WINDOW_MAX) : [],
          review: Array.isArray(cell.review) ? cell.review.map(Boolean).slice(-REVIEW_WINDOW_MAX) : [],
        };
      }
    }
    return matrix;
  };

  const frontierFor = (matrix, track) =>
    ladders[track].find(id => !matrix[track][id].mastered) ?? null;

  // All mastered rung ids for the track — no exclusions. Domains apply their
  // own filtering (e.g. the clock drops uur_24 from its review pool).
  const masteredRungs = (matrix, track) =>
    ladders[track].filter(id => matrix[track][id].mastered);

  const isStruggling = (cell) => {
    const recent = cell.window.slice(-STRUGGLE_LOOKBACK);
    return recent.length >= STRUGGLE_LOOKBACK && countWrong(recent) >= STRUGGLE_MIN_WRONG;
  };

  // Within-session controller: steer the frontier/review mix toward the ~80%
  // success target from the current game's recent answers. Perfect recent play
  // pushes the frontier hard; a rough patch backs off to mostly review.
  const sessionShare = (sessionResults = []) => {
    const recent = sessionResults.slice(-SESSION_LOOKBACK);
    if (recent.length < SESSION_MIN_ANSWERS) return FRONTIER_SHARE;
    return SHARE_BY_SESSION_WRONG[Math.min(countWrong(recent), SHARE_BY_SESSION_WRONG.length - 1)];
  };

  // The session controller sets the base share; a cell the child is actively
  // struggling with is additionally floored down so that specific concept
  // backs off even when the session as a whole is going fine.
  const frontierShare = (cell, sessionResults = []) => {
    const share = sessionShare(sessionResults);
    return isStruggling(cell) ? Math.min(share, FRONTIER_SHARE_STRUGGLING) : share;
  };

  // Record one answer into the matrix. Returns { matrix, events } where events
  // may contain: { type: 'mastered' | 'demoted' | 'slipped', rep, conceptId, ... }.
  // The input matrix is not mutated. Event field names (rep, conceptId, to) are
  // kept clock-compatible even though the params are named track/rungId.
  const recordAnswer = (matrix, track, rungId, role, correct) => {
    // A stale frontier round (e.g. from the revisit queue) may arrive after
    // the concept was already mastered; never re-promote or demote from it.
    if (role === 'frontier' && matrix[track][rungId].mastered) {
      return { matrix, events: [] };
    }

    const events = [];
    const next = structuredClone(matrix);
    const cell = next[track][rungId];

    if (role === 'frontier') {
      cell.window = [...cell.window, correct].slice(-FRONTIER_WINDOW_MAX);
      const streak = cell.window.slice(-PROMOTE_STREAK);
      const recent = cell.window.slice(-PROMOTE_LOOKBACK);
      const promoted = correct && (
        (streak.length >= PROMOTE_STREAK && streak.every(Boolean)) ||
        (recent.length >= PROMOTE_LOOKBACK && countCorrect(recent) >= PROMOTE_MIN_CORRECT)
      );
      if (promoted) {
        next[track][rungId] = { ...freshCell(), mastered: true };
        events.push({ type: 'mastered', rep: track, conceptId: rungId });
      } else if (!correct && cell.window.length >= DEMOTE_MIN_ANSWERS && countCorrect(cell.window) <= DEMOTE_MAX_CORRECT) {
        cell.window = [];
        const ladder = ladders[track];
        const below = ladder.slice(0, ladder.indexOf(rungId)).reverse()
          .find(id => next[track][id].mastered);
        if (below) {
          next[track][below] = freshCell();
          events.push({ type: 'demoted', rep: track, conceptId: rungId, to: below });
        }
      }
    } else {
      cell.review = [...cell.review, correct].slice(-REVIEW_WINDOW_MAX);
      const recent = cell.review.slice(-SLIP_LOOKBACK);
      if (!correct && recent.length >= SLIP_LOOKBACK && countWrong(recent) >= SLIP_MIN_WRONG) {
        next[track][rungId] = freshCell();
        events.push({ type: 'slipped', rep: track, conceptId: rungId });
      }
    }

    return { matrix: next, events };
  };

  return {
    createMatrix,
    normalizeMatrix,
    frontierFor,
    masteredRungs,
    isStruggling,
    sessionShare,
    frontierShare,
    recordAnswer,
  };
};
