import { getDifficulty } from './difficulties.js';
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

const pick = arr => arr[Math.floor(Math.random() * arr.length)];

const PAIRINGS = [['analog', 'digital'], ['analog', 'zin'], ['digital', 'zin']];

const freshTargets = (mode) => {
  if (mode === 'analoog') return { editTarget: 'analog',   refTarget: pick(['digital', 'zin']) };
  if (mode === 'digitaal') return { editTarget: 'digital',  refTarget: pick(['analog',  'zin']) };
  if (mode === 'zin')      return { editTarget: 'zin',      refTarget: pick(['analog',  'digital']) };
  const [a, b] = PAIRINGS[Math.floor(Math.random() * 3)];
  return Math.random() < 0.5
    ? { editTarget: a, refTarget: b }
    : { editTarget: b, refTarget: a };
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

export function createGameStore() {
  const store = createStore({
    screen: 'start',
    mode: null,
    minutesLevel: null,
    hourMode: null,
    roundIndex: 0,
    editTarget: 'digital',
    refTarget: 'analog',
    referenceTime: { hours: 12, minutes: 0 },
    editTime: { hours: 12, minutes: 0 },
    checked: false,
    correct: false,
  });

  return {
    get: store.get,
    subscribe: store.subscribe,
    goToStart: () => store.set({ screen: 'start' }),
    goToModeSelect: () => store.set({ screen: 'mode-select' }),
    goToMinutesSelect: () => store.set({ screen: 'minutes-select' }),
    selectMode: (mode) => store.set({ mode, screen: 'minutes-select' }),
    selectMinutesLevel: (minutesLevel) => store.set({ minutesLevel, screen: 'hour-mode-select' }),
    selectHourMode: (hourMode) => {
      const { mode, minutesLevel } = store.get();
      store.set({ hourMode, screen: 'game', roundIndex: 0, ...freshRound(mode, minutesLevel, hourMode) });
    },
    nextRound: () => {
      const { mode, roundIndex, minutesLevel, hourMode } = store.get();
      const next = roundIndex + 1;
      store.set({ roundIndex: next, ...freshRound(mode, minutesLevel, hourMode) });
    },
    check: () => {
      const { referenceTime, editTime } = store.get();
      store.set({ checked: true, correct: timesEqualAnalog(referenceTime, editTime) });
    },
    setEditTime: (time) => store.set({ editTime: time }),
  };
}
