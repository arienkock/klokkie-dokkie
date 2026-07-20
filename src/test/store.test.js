import { describe, it, expect, beforeEach } from 'vitest';
import { createStore, createGameStore, SESSION_NOMINAL, SESSION_CAP } from '../src/store.js';
import { REPRESENTATIONS } from '../src/domains/clock/concepts.js';
import { frontierFor } from '../src/domains/clock/round.js';

describe('createStore', () => {
  it('returns initial state via get()', () => {
    const store = createStore({ count: 0 });
    expect(store.get()).toEqual({ count: 0 });
  });

  it('set merges patch into state', () => {
    const store = createStore({ a: 1, b: 2 });
    store.set({ b: 99 });
    expect(store.get()).toEqual({ a: 1, b: 99 });
  });

  it('notifies subscribers on set', () => {
    const store = createStore({ x: 0 });
    const calls = [];
    store.subscribe(s => calls.push(s.x));
    store.set({ x: 5 });
    store.set({ x: 10 });
    expect(calls).toEqual([5, 10]);
  });

  it('unsubscribe stops notifications', () => {
    const store = createStore({ x: 0 });
    const calls = [];
    const unsub = store.subscribe(s => calls.push(s.x));
    store.set({ x: 1 });
    unsub();
    store.set({ x: 2 });
    expect(calls).toEqual([1]);
  });

  it('get returns a snapshot copy', () => {
    const store = createStore({ arr: [1, 2] });
    const snap = store.get();
    store.set({ arr: [3] });
    expect(snap.arr).toEqual([1, 2]);
  });
});

const answerCorrect = (store) => {
  store.setAnswer(store.get().round.referenceTime);
  store.check();
};

const answerWrong = (store) => {
  const { referenceTime } = store.get().round;
  store.setAnswer({ hours: referenceTime.hours, minutes: (referenceTime.minutes + 1) % 60 });
  store.check();
};

// Move past feedback (and any celebration) to the next playable state.
const proceed = (store) => {
  store.nextRound();
  if (store.get().screen === 'celebration') store.continueSession();
};

describe('createGameStore', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts on setup screen with all representations selected', () => {
    const store = createGameStore();
    const state = store.get();
    expect(state.screen).toBe('setup');
    expect(state.selectedTracks).toEqual(REPRESENTATIONS);
  });

  it('removes legacy localStorage keys', () => {
    localStorage.setItem('klok-oefenen-scores', '{}');
    localStorage.setItem('klok-oefenen-adaptive', '{}');
    createGameStore();
    expect(localStorage.getItem('klok-oefenen-scores')).toBeNull();
    expect(localStorage.getItem('klok-oefenen-adaptive')).toBeNull();
  });

  it('toggleTrack removes and re-adds a representation', () => {
    const store = createGameStore();
    store.toggleTrack('zin');
    expect(store.get().selectedTracks).toEqual(['analog', 'digital']);
    store.toggleTrack('zin');
    expect(store.get().selectedTracks).toContain('zin');
  });

  it('startSession refuses fewer than 2 representations', () => {
    const store = createGameStore();
    store.toggleTrack('zin');
    store.toggleTrack('digital');
    store.startSession();
    expect(store.get().screen).toBe('setup');
  });

  it('startSession begins a game with a fresh heel_uur frontier round', () => {
    const store = createGameStore();
    store.startSession();
    const state = store.get();
    expect(state.screen).toBe('game');
    expect(state.roundIndex).toBe(0);
    expect(state.sessionHistory).toEqual([]);
    expect(state.round.rungId).toBe('heel_uur');
    expect(state.round.role).toBe('frontier');
    expect(state.round.referenceTime.minutes).toBe(0);
    expect(state.answerState).toEqual({ hours: 1, minutes: 0 });
    expect(state.round.editTarget).not.toBe(state.round.refTarget);
  });

  it('startSession persists the representation selection', () => {
    const store = createGameStore();
    store.toggleTrack('zin');
    store.startSession();
    const store2 = createGameStore();
    expect(store2.get().selectedTracks).toEqual(['analog', 'digital']);
  });

  it('check marks correct and records into the mastery matrix', () => {
    const store = createGameStore();
    store.startSession();
    const { round } = store.get();
    answerCorrect(store);
    const state = store.get();
    expect(state.checked).toBe(true);
    expect(state.correct).toBe(true);
    expect(state.sessionHistory).toEqual([true]);
    expect(state.matrix[round.attributionTrack][round.rungId].window).toEqual([true]);
  });

  it('check marks incorrect and enqueues a revisit', () => {
    const store = createGameStore();
    store.startSession();
    answerWrong(store);
    const state = store.get();
    expect(state.correct).toBe(false);
    expect(state.sessionHistory).toEqual([false]);
    expect(state.revisitQueue).toHaveLength(1);
    expect(state.roundsSinceEnqueue).toBe(0);
  });

  it('persists the matrix so a new store resumes progress', () => {
    const store = createGameStore();
    store.startSession();
    answerCorrect(store);
    const store2 = createGameStore();
    const { matrix } = store2.get();
    const rep = store.get().round.attributionTrack;
    expect(matrix[rep].heel_uur.window).toEqual([true]);
  });

  it('mastering a concept triggers the celebration screen, then continues', () => {
    const store = createGameStore();
    store.toggleTrack('zin'); // analog + digital only, fewer reps to master
    store.startSession();
    let celebrated = false;
    for (let i = 0; i < 15 && !celebrated; i++) {
      answerCorrect(store);
      if (store.get().pendingMastery) {
        const { pendingMastery } = store.get();
        expect(pendingMastery.type).toBe('mastered');
        expect(pendingMastery.conceptId).toBe('heel_uur');
        store.nextRound();
        expect(store.get().screen).toBe('celebration');
        expect(store.get().celebration.conceptId).toBe('heel_uur');
        store.continueSession();
        expect(store.get().screen).toBe('game');
        celebrated = true;
      } else {
        store.nextRound();
      }
    }
    expect(celebrated).toBe(true);
  });

  it('mastery updates the frontier for the mastered representation', () => {
    const store = createGameStore();
    store.toggleTrack('zin');
    store.startSession();
    for (let i = 0; i < 30 && store.get().screen !== 'session-end'; i++) {
      answerCorrect(store);
      proceed(store);
    }
    const { matrix } = store.get();
    const advanced = ['analog', 'digital'].some(rep => frontierFor(matrix, rep) !== 'heel_uur');
    expect(advanced).toBe(true);
  });

  it('session ends on a high note at the nominal length', () => {
    const store = createGameStore();
    store.startSession();
    for (let i = 0; i < SESSION_NOMINAL; i++) {
      answerCorrect(store);
      proceed(store);
    }
    expect(store.get().screen).toBe('session-end');
    expect(store.get().sessionHistory).toHaveLength(SESSION_NOMINAL);
  });

  it('session continues past nominal length until a correct answer', () => {
    const store = createGameStore();
    store.startSession();
    for (let i = 0; i < SESSION_NOMINAL - 1; i++) {
      answerCorrect(store);
      proceed(store);
    }
    answerWrong(store); // answer #20 wrong → keep going
    proceed(store);
    expect(store.get().screen).toBe('game');
    answerCorrect(store); // answer #21 correct → end
    proceed(store);
    expect(store.get().screen).toBe('session-end');
    expect(store.get().sessionHistory).toHaveLength(SESSION_NOMINAL + 1);
  });

  it('session hard-caps even without a final correct answer', () => {
    const store = createGameStore();
    store.startSession();
    for (let i = 0; i < SESSION_CAP; i++) {
      if (store.get().screen !== 'game') break;
      answerWrong(store);
      proceed(store);
    }
    expect(store.get().screen).toBe('session-end');
    expect(store.get().sessionHistory).toHaveLength(SESSION_CAP);
  });

  it('revisit queue replays a missed problem after two rounds', () => {
    const store = createGameStore();
    store.startSession();
    answerWrong(store);
    const missed = store.get().revisitQueue[0];
    proceed(store); // round 1 after miss (fresh)
    answerCorrect(store);
    proceed(store); // round 2 after miss (fresh)
    answerCorrect(store);
    proceed(store); // now the revisit is due
    const state = store.get();
    expect(state.revisitQueue).toHaveLength(0);
    expect(state.round.referenceTime).toEqual(missed.referenceTime);
    expect(state.round.editTarget).toBe(missed.editTarget);
    expect(state.round.refTarget).toBe(missed.refTarget);
  });

  it('goToSetup resets the session but keeps the matrix', () => {
    const store = createGameStore();
    store.startSession();
    answerCorrect(store);
    store.goToSetup();
    const state = store.get();
    expect(state.screen).toBe('setup');
    expect(state.sessionHistory).toEqual([]);
    const rep = Object.keys(state.matrix).find(r => state.matrix[r].heel_uur.window.length > 0);
    expect(rep).toBeDefined();
  });

  it('editTarget and refTarget are always different across rounds', () => {
    const store = createGameStore();
    store.startSession();
    for (let i = 0; i < 10; i++) {
      const { round, screen } = store.get();
      if (screen !== 'game') break;
      expect(round.editTarget).not.toBe(round.refTarget);
      answerCorrect(store);
      proceed(store);
    }
  });
});
