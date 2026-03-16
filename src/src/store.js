import { randomTime, timesEqualAnalog } from './utils/time.js';

export function createStore(initial) {
  let state = { ...initial };
  const subs = new Set();

  return {
    get: () => ({ ...state }),
    getTime: () => ({ ...state }),
    set: (patch) => {
      state = { ...state, ...patch };
      subs.forEach(fn => fn({ ...state }));
    },
    setTime: (patch) => {
      state = { ...state, ...patch };
      subs.forEach(fn => fn({ ...state }));
    },
    subscribe: (fn) => {
      subs.add(fn);
      return () => subs.delete(fn);
    },
  };
}

const editTargetForMode = (mode, roundIndex) =>
  mode === 'analoog' ? 'analog'
  : mode === 'digitaal' ? 'digital'
  : roundIndex % 2 === 0 ? 'digital' : 'analog';

const freshRound = (mode, roundIndex) => ({
  referenceTime: randomTime(),
  editTime: { hours: 12, minutes: 0 },
  editTarget: editTargetForMode(mode, roundIndex),
  checked: false,
  correct: false,
});

export function createGameStore() {
  const store = createStore({
    screen: 'start',
    mode: null,
    roundIndex: 0,
    editTarget: 'digital',
    referenceTime: { hours: 12, minutes: 0 },
    editTime: { hours: 12, minutes: 0 },
    checked: false,
    correct: false,
  });

  return {
    get: store.get,
    subscribe: store.subscribe,
    goToModeSelect: () => store.set({ screen: 'mode-select' }),
    selectMode: (mode) => {
      store.set({ screen: 'game', mode, roundIndex: 0, ...freshRound(mode, 0) });
    },
    nextRound: () => {
      const { mode, roundIndex } = store.get();
      const next = roundIndex + 1;
      store.set({ roundIndex: next, ...freshRound(mode, next) });
    },
    check: () => {
      const { referenceTime, editTime } = store.get();
      store.set({ checked: true, correct: timesEqualAnalog(referenceTime, editTime) });
    },
    setEditTime: (time) => store.set({ editTime: time }),
  };
}
