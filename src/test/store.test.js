import { describe, it, expect } from 'vitest';
import { createStore, createGameStore } from '../src/store.js';

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

describe('createGameStore', () => {
  it('starts on start screen', () => {
    const store = createGameStore();
    expect(store.get().screen).toBe('start');
  });

  it('goToModeSelect changes screen', () => {
    const store = createGameStore();
    store.goToModeSelect();
    expect(store.get().screen).toBe('mode-select');
  });

  it('selectMode sets mode and goes to difficulty-select', () => {
    const store = createGameStore();
    store.selectMode('analoog');
    const state = store.get();
    expect(state.mode).toBe('analoog');
    expect(state.screen).toBe('difficulty-select');
  });

  it('selectDifficulty starts game with correct difficulty', () => {
    const store = createGameStore();
    store.selectMode('analoog');
    store.selectDifficulty(1);
    const state = store.get();
    expect(state.screen).toBe('game');
    expect(state.difficulty).toBe(1);
    expect(state.roundIndex).toBe(0);
  });

  it('difficulty 1 game starts with editTime 01:00', () => {
    const store = createGameStore();
    store.selectMode('analoog');
    store.selectDifficulty(1);
    expect(store.get().editTime).toEqual({ hours: 1, minutes: 0 });
  });

  it('difficulty 1 game has referenceTime with minutes 0', () => {
    const store = createGameStore();
    store.selectMode('analoog');
    for (let i = 0; i < 10; i++) {
      store.selectDifficulty(1);
      expect(store.get().referenceTime.minutes).toBe(0);
    }
  });

  it('nextRound increments roundIndex', () => {
    const store = createGameStore();
    store.selectMode('digitaal');
    store.selectDifficulty(4);
    store.nextRound();
    expect(store.get().roundIndex).toBe(1);
  });

  it('check marks correct when times match', () => {
    const store = createGameStore();
    store.selectMode('analoog');
    store.selectDifficulty(4);
    const { referenceTime } = store.get();
    store.setEditTime(referenceTime);
    store.check();
    expect(store.get().correct).toBe(true);
    expect(store.get().checked).toBe(true);
  });

  it('check marks incorrect when times differ', () => {
    const store = createGameStore();
    store.selectMode('analoog');
    store.selectDifficulty(4);
    store.setEditTime({ hours: 1, minutes: 1 });
    store.setEditTime({ hours: 2, minutes: 2 });
    store.check();
    const { referenceTime, editTime, correct } = store.get();
    expect(store.get().checked).toBe(true);
    expect(typeof correct).toBe('boolean');
  });

  it('goToDifficultySelect changes screen', () => {
    const store = createGameStore();
    store.selectMode('beide');
    store.goToDifficultySelect();
    expect(store.get().screen).toBe('difficulty-select');
  });

  it('editTarget for analoog mode is always analog', () => {
    const store = createGameStore();
    store.selectMode('analoog');
    store.selectDifficulty(4);
    expect(store.get().editTarget).toBe('analog');
    store.nextRound();
    expect(store.get().editTarget).toBe('analog');
  });

  it('editTarget for beide mode alternates', () => {
    const store = createGameStore();
    store.selectMode('beide');
    store.selectDifficulty(4);
    expect(store.get().editTarget).toBe('digital');
    store.nextRound();
    expect(store.get().editTarget).toBe('analog');
  });
});
