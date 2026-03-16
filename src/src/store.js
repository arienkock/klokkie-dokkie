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

const editTargetForMode = (mode, roundIndex) =>
  mode === 'analoog' ? 'analog'
  : mode === 'digitaal' ? 'digital'
  : roundIndex % 2 === 0 ? 'digital' : 'analog';

const freshRound = (mode, roundIndex, difficultyId) => {
  const diff = getDifficulty(difficultyId);
  return {
    referenceTime: diff.randomTime(),
    editTime: { ...diff.initialEditTime },
    editTarget: editTargetForMode(mode, roundIndex),
    checked: false,
    correct: false,
  };
};

export function createGameStore() {
  const store = createStore({
    screen: 'start',
    mode: null,
    difficulty: null,
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
    goToStart: () => store.set({ screen: 'start' }),
    goToModeSelect: () => store.set({ screen: 'mode-select' }),
    goToDifficultySelect: () => store.set({ screen: 'difficulty-select' }),
    selectMode: (mode) => store.set({ mode, screen: 'difficulty-select' }),
    selectDifficulty: (difficultyId) => {
      const { mode } = store.get();
      store.set({ difficulty: difficultyId, screen: 'game', roundIndex: 0, ...freshRound(mode, 0, difficultyId) });
    },
    nextRound: () => {
      const { mode, roundIndex, difficulty } = store.get();
      const next = roundIndex + 1;
      store.set({ roundIndex: next, ...freshRound(mode, next, difficulty) });
    },
    check: () => {
      const { referenceTime, editTime } = store.get();
      store.set({ checked: true, correct: timesEqualAnalog(referenceTime, editTime) });
    },
    setEditTime: (time) => store.set({ editTime: time }),
  };
}
