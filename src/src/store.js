import { getDifficulty, MINUTE_LEVELS, HOUR_MODES, ADAPTIVE_LEVELS } from './difficulties.js';
import { timesEqualAnalog } from './utils/time.js';

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

const LS_KEY = 'klok-oefenen-scores';
const LS_ADAPTIVE_KEY = 'klok-oefenen-adaptive';

const loadScores = () => {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); }
  catch { return {}; }
};

const saveScores = (scores) => {
  try { localStorage.setItem(LS_KEY, JSON.stringify(scores)); }
  catch {}
};

const loadAdaptiveLevels = () => {
  try { return JSON.parse(localStorage.getItem(LS_ADAPTIVE_KEY) || '{}'); }
  catch { return {}; }
};

const saveAdaptiveLevel = (mode, level) => {
  try {
    const all = loadAdaptiveLevels();
    localStorage.setItem(LS_ADAPTIVE_KEY, JSON.stringify({ ...all, [mode]: level }));
  } catch {}
};

export const gameKey = (mode, minutesLevel, hourMode) => `${mode}-${minutesLevel}-${hourMode}`;

export const getOptionStatus = (scores, mode, minutesLevel = null, hourMode = null) => {
  const levels = minutesLevel !== null ? [minutesLevel] : MINUTE_LEVELS.map(l => l.id);
  const hours  = hourMode   !== null ? [hourMode]   : HOUR_MODES.map(m => m.id);
  const entries = levels.flatMap(l => hours.map(h => scores[gameKey(mode, l, h)])).filter(Boolean);
  if (!entries.length) return null;
  return {
    completed:  entries.some(e => e.completed),
    percentage: Math.max(...entries.map(e => e.percentage)),
  };
};

const pick = arr => arr[Math.floor(Math.random() * arr.length)];

const PAIRINGS = [['analog', 'digital'], ['analog', 'zin'], ['digital', 'zin']];

const freshTargets = (mode) => {
  if (mode === 'analoog')  return { editTarget: 'analog',  refTarget: pick(['digital', 'zin']) };
  if (mode === 'digitaal') return { editTarget: 'digital', refTarget: pick(['analog',  'zin']) };
  if (mode === 'zin')      return { editTarget: 'zin',     refTarget: pick(['analog',  'digital']) };
  const [a, b] = PAIRINGS[Math.floor(Math.random() * 3)];
  return Math.random() < 0.5 ? { editTarget: a, refTarget: b } : { editTarget: b, refTarget: a };
};

const freshRound = (mode, minutesLevel, hourMode) => {
  const diff = getDifficulty(minutesLevel, hourMode);
  return {
    referenceTime: diff.randomTime(),
    editTime: { ...diff.initialEditTime },
    ...freshTargets(mode),
    checked: false,
    correct: false,
  };
};

const rollingPercentage = (history) => {
  const w = history.slice(-20);
  return w.length === 0 ? 0 : Math.round(w.filter(Boolean).length / w.length * 100);
};

const isComplete = (history) =>
  history.length >= 20 && history.slice(-20).filter(Boolean).length >= 18;

const REVISIT_QUEUE_MAX = 5;
const REVISIT_AFTER = 2;

const enqueueRevisit = (queue, problem) => {
  const next = [...queue, problem];
  return next.length > REVISIT_QUEUE_MAX ? next.slice(1) : next;
};

export function createGameStore() {
  const store = createStore({
    screen: 'mode-select',
    mode: null,
    minutesLevel: null,
    hourMode: null,
    adaptive: false,
    adaptiveLevel: 0,
    currentGameKey: null,
    sessionHistory: [],
    roundIndex: 0,
    editTarget: 'digital',
    refTarget: 'analog',
    referenceTime: { hours: 12, minutes: 0 },
    editTime: { hours: 12, minutes: 0 },
    checked: false,
    correct: false,
    scores: loadScores(),
    revisitQueue: [],
    roundsSinceEnqueue: 0,
  });

  return {
    get: store.get,
    subscribe: store.subscribe,
    goToModeSelect: () => store.set({ screen: 'mode-select', currentGameKey: null, sessionHistory: [], revisitQueue: [], roundsSinceEnqueue: 0, adaptive: false }),
    goToMinutesSelect: () => store.set({ screen: 'minutes-select' }),
    selectMode: (mode) => store.set({ mode, screen: 'minutes-select' }),
    selectMinutesLevel: (minutesLevel) => store.set({ minutesLevel, screen: 'hour-mode-select' }),
    selectHourMode: (hourMode) => {
      const { mode, minutesLevel } = store.get();
      const key = gameKey(mode, minutesLevel, hourMode);
      store.set({ hourMode, adaptive: false, screen: 'game', roundIndex: 0, currentGameKey: key, sessionHistory: [], revisitQueue: [], roundsSinceEnqueue: 0, ...freshRound(mode, minutesLevel, hourMode) });
    },
    selectAdaptive: () => {
      const { mode } = store.get();
      const savedLevel = (loadAdaptiveLevels()[mode] ?? 0);
      const adl = ADAPTIVE_LEVELS[savedLevel];
      store.set({
        adaptive: true,
        adaptiveLevel: savedLevel,
        minutesLevel: adl.minuteLevelId,
        hourMode: adl.hourModeId,
        screen: 'game',
        roundIndex: 0,
        currentGameKey: `${mode}-adaptive`,
        sessionHistory: [],
        revisitQueue: [],
        roundsSinceEnqueue: 0,
        ...freshRound(mode, adl.minuteLevelId, adl.hourModeId),
      });
    },
    nextRound: () => {
      const { mode, roundIndex, minutesLevel, hourMode, revisitQueue, roundsSinceEnqueue } = store.get();
      const diff = getDifficulty(minutesLevel, hourMode);
      const useRevisit = revisitQueue.length > 0 && roundsSinceEnqueue >= REVISIT_AFTER;
      const [revisitProblem, ...remainingQueue] = revisitQueue;
      const round = useRevisit
        ? { ...revisitProblem, editTime: { ...diff.initialEditTime }, checked: false, correct: false }
        : freshRound(mode, minutesLevel, hourMode);
      store.set({
        roundIndex: roundIndex + 1,
        revisitQueue: useRevisit ? remainingQueue : revisitQueue,
        roundsSinceEnqueue: useRevisit ? 0 : roundsSinceEnqueue + 1,
        ...round,
      });
    },
    check: () => {
      const { referenceTime, editTime, scores, currentGameKey, sessionHistory, revisitQueue, editTarget, refTarget, adaptive, adaptiveLevel, mode } = store.get();
      const correct = timesEqualAnalog(referenceTime, editTime);
      const newSession = [...sessionHistory, correct];
      const percentage = rollingPercentage(newSession);
      const prev = scores[currentGameKey] || { completed: false, percentage: 0 };
      const completed = isComplete(newSession) || prev.completed;
      const newScores = { ...scores, [currentGameKey]: { completed, percentage } };
      saveScores(newScores);
      const justCompleted = isComplete(newSession) && !prev.completed;
      const newRevisitQueue = correct ? revisitQueue : enqueueRevisit(revisitQueue, { referenceTime, editTarget, refTarget });
      let adaptivePatch = {};
      if (adaptive) {
        const newAdaptiveLevel = correct
          ? Math.min(adaptiveLevel + 2, ADAPTIVE_LEVELS.length - 1)
          : Math.max(adaptiveLevel - 1, 0);
        saveAdaptiveLevel(mode, newAdaptiveLevel);
        const adl = ADAPTIVE_LEVELS[newAdaptiveLevel];
        adaptivePatch = { adaptiveLevel: newAdaptiveLevel, minutesLevel: adl.minuteLevelId, hourMode: adl.hourModeId };
      }
      store.set({
        checked: true,
        correct,
        sessionHistory: newSession,
        scores: newScores,
        revisitQueue: newRevisitQueue,
        ...(!correct ? { roundsSinceEnqueue: 0 } : {}),
        ...(justCompleted ? { screen: 'game-complete' } : {}),
        ...adaptivePatch,
      });
    },
    setEditTime: (time) => store.set({ editTime: time }),
  };
}
