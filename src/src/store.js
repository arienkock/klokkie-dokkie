import { getConcept, REPRESENTATIONS } from './concepts.js';
import { createMatrix, normalizeMatrix, pickRound, recordAnswer } from './mastery.js';
import { timesEqualAnalog } from './domains/clock/util/time.js';

export function createStore(initial) {
  let state = { ...initial };
  const subs = new Set();

  return {
    get: () => ({ ...state }),
    set: (patch) => {
      state = { ...state, ...patch };
      subs.forEach(fn => fn({ ...state }));
    },
    subscribe: (fn) => {
      subs.add(fn);
      return () => subs.delete(fn);
    },
  };
}

const MATRIX_KEY = 'klokkie-mastery-v1';
const REPS_KEY = 'klokkie-reps-v1';
const LEGACY_KEYS = ['klok-oefenen-scores', 'klok-oefenen-adaptive'];

const loadMatrix = () => {
  try { return normalizeMatrix(JSON.parse(localStorage.getItem(MATRIX_KEY))); }
  catch { return createMatrix(); }
};

const saveMatrix = (matrix) => {
  try { localStorage.setItem(MATRIX_KEY, JSON.stringify(matrix)); }
  catch {}
};

const loadReps = () => {
  try {
    const reps = JSON.parse(localStorage.getItem(REPS_KEY));
    const valid = Array.isArray(reps) ? reps.filter(r => REPRESENTATIONS.includes(r)) : [];
    return valid.length >= 2 ? valid : [...REPRESENTATIONS];
  } catch { return [...REPRESENTATIONS]; }
};

const saveReps = (reps) => {
  try { localStorage.setItem(REPS_KEY, JSON.stringify(reps)); }
  catch {}
};

export const SESSION_NOMINAL = 20; // aim for this many rounds…
export const SESSION_CAP = 25;     // …but never more than this many

const REVISIT_QUEUE_MAX = 5;
const REVISIT_AFTER = 2;

const enqueueRevisit = (queue, problem) => {
  const next = [...queue, problem];
  return next.length > REVISIT_QUEUE_MAX ? next.slice(1) : next;
};

export function createGameStore() {
  LEGACY_KEYS.forEach(k => { try { localStorage.removeItem(k); } catch {} });

  const store = createStore({
    screen: 'setup',
    selectedReps: loadReps(),
    matrix: loadMatrix(),
    roundIndex: 0,
    sessionHistory: [],
    revisitQueue: [],
    roundsSinceEnqueue: 0,
    pendingMastery: null,
    celebration: null,
    editTarget: 'digital',
    refTarget: 'analog',
    roundMeta: null,
    referenceTime: { hours: 12, minutes: 0 },
    editTime: { hours: 12, minutes: 0 },
    checked: false,
    correct: false,
  });

  const freshRound = (matrix, selectedReps, sessionHistory) => {
    const r = pickRound(matrix, selectedReps, Math.random, sessionHistory);
    return {
      editTarget: r.editTarget,
      refTarget: r.refTarget,
      roundMeta: {
        attributionRep: r.attributionRep,
        conceptId: r.conceptId,
        minuteConceptId: r.minuteConceptId,
        role: r.role,
      },
      referenceTime: r.time,
      editTime: { ...getConcept(r.minuteConceptId).initialEditTime },
      checked: false,
      correct: false,
    };
  };

  const revisitRound = (problem) => ({
    ...problem,
    editTime: { ...getConcept(problem.roundMeta.minuteConceptId).initialEditTime },
    checked: false,
    correct: false,
  });

  const advance = () => {
    const { matrix, selectedReps, sessionHistory, roundIndex, revisitQueue, roundsSinceEnqueue } = store.get();
    const answered = sessionHistory.length;
    const endedOnHighNote = answered >= SESSION_NOMINAL && sessionHistory[answered - 1] === true;
    if (answered >= SESSION_CAP || endedOnHighNote) {
      store.set({ screen: 'session-end' });
      return;
    }
    const useRevisit = revisitQueue.length > 0 && roundsSinceEnqueue >= REVISIT_AFTER;
    const round = useRevisit ? revisitRound(revisitQueue[0]) : freshRound(matrix, selectedReps, sessionHistory);
    store.set({
      screen: 'game',
      roundIndex: roundIndex + 1,
      revisitQueue: useRevisit ? revisitQueue.slice(1) : revisitQueue,
      roundsSinceEnqueue: useRevisit ? 0 : roundsSinceEnqueue + 1,
      ...round,
    });
  };

  return {
    get: store.get,
    subscribe: store.subscribe,

    toggleRep: (rep) => {
      const { selectedReps } = store.get();
      const next = selectedReps.includes(rep)
        ? selectedReps.filter(r => r !== rep)
        : [...selectedReps, rep];
      store.set({ selectedReps: next });
    },

    goToSetup: () => store.set({
      screen: 'setup',
      roundIndex: 0,
      sessionHistory: [],
      revisitQueue: [],
      roundsSinceEnqueue: 0,
      pendingMastery: null,
      celebration: null,
    }),

    startSession: () => {
      const { selectedReps, matrix } = store.get();
      if (selectedReps.length < 2) return;
      saveReps(selectedReps);
      store.set({
        screen: 'game',
        roundIndex: 0,
        sessionHistory: [],
        revisitQueue: [],
        roundsSinceEnqueue: 0,
        pendingMastery: null,
        celebration: null,
        ...freshRound(matrix, selectedReps, []),
      });
    },

    setEditTime: (time) => store.set({ editTime: time }),

    // forcedCorrect: pass a boolean to override the time comparison — used by
    // the zin editor, where a wrong word order has no time representation.
    check: (forcedCorrect) => {
      const {
        matrix, referenceTime, editTime, roundMeta, checked,
        sessionHistory, revisitQueue, editTarget, refTarget,
      } = store.get();
      if (checked) return;
      const correct = typeof forcedCorrect === 'boolean'
        ? forcedCorrect
        : timesEqualAnalog(referenceTime, editTime);
      const { matrix: newMatrix, events } = recordAnswer(
        matrix, roundMeta.attributionRep, roundMeta.conceptId, roundMeta.role, correct
      );
      saveMatrix(newMatrix);
      const mastered = events.find(e => e.type === 'mastered') ?? null;
      store.set({
        checked: true,
        correct,
        matrix: newMatrix,
        sessionHistory: [...sessionHistory, correct],
        pendingMastery: mastered,
        revisitQueue: correct
          ? revisitQueue
          : enqueueRevisit(revisitQueue, { referenceTime, editTarget, refTarget, roundMeta }),
        ...(!correct ? { roundsSinceEnqueue: 0 } : {}),
      });
    },

    nextRound: () => {
      const { pendingMastery } = store.get();
      if (pendingMastery) {
        store.set({ screen: 'celebration', celebration: pendingMastery, pendingMastery: null });
        return;
      }
      advance();
    },

    // From the celebration screen: resume the session (or end it).
    continueSession: () => advance(),
  };
}
