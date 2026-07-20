// Domain-agnostic practice core: generic pub/sub store + session lifecycle.
// Matrix ops come from `engine`, round generation + grading from `domain`,
// persistence from `storage`. Imports nothing from `domains/` or concepts.

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

export const SESSION_NOMINAL = 20; // aim for this many rounds…
export const SESSION_CAP = 25;     // …but never more than this many

const REVISIT_QUEUE_MAX = 5;
const REVISIT_AFTER = 2;

const enqueueRevisit = (queue, round) => {
  const next = [...queue, round];
  return next.length > REVISIT_QUEUE_MAX ? next.slice(1) : next;
};

export function createGame({ engine, domain, storage }) {
  const { matrix: MATRIX_KEY, tracks: TRACKS_KEY } = domain.storageKeys;
  const validTrackIds = domain.tracks.map(t => t.id);
  const minTracks = domain.setup.minTracks;

  const loadMatrix = () => {
    try { return engine.normalizeMatrix(JSON.parse(storage.getItem(MATRIX_KEY))); }
    catch { return engine.createMatrix(); }
  };

  const saveMatrix = (matrix) => {
    try { storage.setItem(MATRIX_KEY, JSON.stringify(matrix)); }
    catch {}
  };

  const loadTracks = () => {
    try {
      const tracks = JSON.parse(storage.getItem(TRACKS_KEY));
      const valid = Array.isArray(tracks) ? tracks.filter(t => validTrackIds.includes(t)) : [];
      return valid.length >= minTracks ? valid : [...validTrackIds];
    } catch { return [...validTrackIds]; }
  };

  const saveTracks = (tracks) => {
    try { storage.setItem(TRACKS_KEY, JSON.stringify(tracks)); }
    catch {}
  };

  (domain.legacyStorageKeys ?? []).forEach(k => { try { storage.removeItem(k); } catch {} });

  const store = createStore({
    screen: 'setup',
    selectedTracks: loadTracks(),
    matrix: loadMatrix(),
    roundIndex: 0,
    sessionHistory: [],
    revisitQueue: [],
    roundsSinceEnqueue: 0,
    pendingMastery: null,
    celebration: null,
    round: null,
    answerState: null,
    checked: false,
    correct: false,
  });

  const freshRound = (matrix, selectedTracks, sessionHistory) => {
    const round = domain.pickRound(engine, matrix, selectedTracks, Math.random, sessionHistory);
    return {
      round,
      answerState: domain.initAnswer(round),
      checked: false,
      correct: false,
    };
  };

  const revisitRound = (round) => ({
    round,
    answerState: domain.initAnswer(round),
    checked: false,
    correct: false,
  });

  const advance = () => {
    const { matrix, selectedTracks, sessionHistory, roundIndex, revisitQueue, roundsSinceEnqueue } = store.get();
    const answered = sessionHistory.length;
    const endedOnHighNote = answered >= SESSION_NOMINAL && sessionHistory[answered - 1] === true;
    if (answered >= SESSION_CAP || endedOnHighNote) {
      store.set({ screen: 'session-end' });
      return;
    }
    const useRevisit = revisitQueue.length > 0 && roundsSinceEnqueue >= REVISIT_AFTER;
    const round = useRevisit ? revisitRound(revisitQueue[0]) : freshRound(matrix, selectedTracks, sessionHistory);
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

    toggleTrack: (track) => {
      const { selectedTracks } = store.get();
      const next = selectedTracks.includes(track)
        ? selectedTracks.filter(t => t !== track)
        : [...selectedTracks, track];
      store.set({ selectedTracks: next });
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
      const { selectedTracks, matrix } = store.get();
      if (selectedTracks.length < minTracks) return;
      saveTracks(selectedTracks);
      store.set({
        screen: 'game',
        roundIndex: 0,
        sessionHistory: [],
        revisitQueue: [],
        roundsSinceEnqueue: 0,
        pendingMastery: null,
        celebration: null,
        ...freshRound(matrix, selectedTracks, []),
      });
    },

    setAnswer: (value) => store.set({ answerState: value }),

    // explicitCorrect: pass a boolean to override domain grading — used by
    // auto-submit widgets (e.g. the zin editor) that already know correctness.
    check: (explicitCorrect) => {
      const { matrix, round, answerState, checked, sessionHistory, revisitQueue } = store.get();
      if (checked) return;
      const correct = typeof explicitCorrect === 'boolean'
        ? explicitCorrect
        : domain.grade(round, answerState);
      const { matrix: newMatrix, events } = engine.recordAnswer(
        matrix, round.attributionTrack, round.rungId, round.role, correct
      );
      saveMatrix(newMatrix);
      const mastered = events.find(e => e.type === 'mastered') ?? null;
      store.set({
        checked: true,
        correct,
        matrix: newMatrix,
        sessionHistory: [...sessionHistory, correct],
        pendingMastery: mastered,
        revisitQueue: correct ? revisitQueue : enqueueRevisit(revisitQueue, round),
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
