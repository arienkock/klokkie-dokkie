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

  it('selectMode sets mode and goes to minutes-select', () => {
    const store = createGameStore();
    store.selectMode('analoog');
    const state = store.get();
    expect(state.mode).toBe('analoog');
    expect(state.screen).toBe('minutes-select');
  });

  it('selectMinutesLevel sets minutesLevel and goes to hour-mode-select', () => {
    const store = createGameStore();
    store.selectMode('analoog');
    store.selectMinutesLevel(1);
    const state = store.get();
    expect(state.minutesLevel).toBe(1);
    expect(state.screen).toBe('hour-mode-select');
  });

  it('selectHourMode starts game with correct state', () => {
    const store = createGameStore();
    store.selectMode('analoog');
    store.selectMinutesLevel(1);
    store.selectHourMode('12h');
    const state = store.get();
    expect(state.screen).toBe('game');
    expect(state.minutesLevel).toBe(1);
    expect(state.hourMode).toBe('12h');
    expect(state.roundIndex).toBe(0);
  });

  it('level 1 game starts with editTime 01:00', () => {
    const store = createGameStore();
    store.selectMode('analoog');
    store.selectMinutesLevel(1);
    store.selectHourMode('12h');
    expect(store.get().editTime).toEqual({ hours: 1, minutes: 0 });
  });

  it('level 1 game has referenceTime with minutes 0', () => {
    const store = createGameStore();
    store.selectMode('analoog');
    for (let i = 0; i < 10; i++) {
      store.selectMinutesLevel(1);
      store.selectHourMode('12h');
      expect(store.get().referenceTime.minutes).toBe(0);
    }
  });

  it('level 1 + 24h game has referenceTime hours 1-23', () => {
    const store = createGameStore();
    store.selectMode('analoog');
    for (let i = 0; i < 20; i++) {
      store.selectMinutesLevel(1);
      store.selectHourMode('24h');
      const { hours } = store.get().referenceTime;
      expect(hours).toBeGreaterThanOrEqual(1);
      expect(hours).toBeLessThanOrEqual(23);
    }
  });

  it('nextRound increments roundIndex', () => {
    const store = createGameStore();
    store.selectMode('digitaal');
    store.selectMinutesLevel(4);
    store.selectHourMode('12h');
    store.nextRound();
    expect(store.get().roundIndex).toBe(1);
  });

  it('check marks correct when times match', () => {
    const store = createGameStore();
    store.selectMode('analoog');
    store.selectMinutesLevel(4);
    store.selectHourMode('12h');
    const { referenceTime } = store.get();
    store.setEditTime(referenceTime);
    store.check();
    expect(store.get().correct).toBe(true);
    expect(store.get().checked).toBe(true);
  });

  it('check accepts analog-equivalent 24h time (14:00 matches 2:00)', () => {
    const store = createGameStore();
    store.selectMode('digitaal');
    store.selectMinutesLevel(1);
    store.selectHourMode('24h');
    const { referenceTime } = store.get();
    const analog12h = { hours: referenceTime.hours % 12 || 12, minutes: referenceTime.minutes };
    store.setEditTime(analog12h);
    store.check();
    expect(store.get().correct).toBe(true);
  });

  it('check marks incorrect when times differ', () => {
    const store = createGameStore();
    store.selectMode('analoog');
    store.selectMinutesLevel(4);
    store.selectHourMode('12h');
    const { referenceTime } = store.get();
    const refH = referenceTime.hours % 12;
    const wrongTime = { hours: refH === 1 ? 2 : 1, minutes: referenceTime.minutes === 0 ? 5 : 0 };
    store.setEditTime(wrongTime);
    store.check();
    expect(store.get().checked).toBe(true);
    expect(store.get().correct).toBe(false);
  });

  it('goToMinutesSelect changes screen', () => {
    const store = createGameStore();
    store.selectMode('beide');
    store.goToMinutesSelect();
    expect(store.get().screen).toBe('minutes-select');
  });

  it('editTarget for analoog mode is always analog', () => {
    const store = createGameStore();
    store.selectMode('analoog');
    store.selectMinutesLevel(4);
    store.selectHourMode('12h');
    expect(store.get().editTarget).toBe('analog');
    store.nextRound();
    expect(store.get().editTarget).toBe('analog');
  });

  it('editTarget for beide mode is one of the three component types', () => {
    const store = createGameStore();
    store.selectMode('beide');
    store.selectMinutesLevel(4);
    store.selectHourMode('12h');
    const valid = ['analog', 'digital', 'zin'];
    expect(valid).toContain(store.get().editTarget);
    store.nextRound();
    expect(valid).toContain(store.get().editTarget);
  });

  it('editTarget and refTarget are always different', () => {
    const store = createGameStore();
    for (const mode of ['analoog', 'digitaal', 'zin', 'beide']) {
      store.selectMode(mode);
      store.selectMinutesLevel(4);
      store.selectHourMode('12h');
      for (let i = 0; i < 5; i++) {
        const { editTarget, refTarget } = store.get();
        expect(editTarget).not.toBe(refTarget);
        store.nextRound();
      }
    }
  });

  it('editTarget for zin mode is always zin', () => {
    const store = createGameStore();
    store.selectMode('zin');
    store.selectMinutesLevel(4);
    store.selectHourMode('12h');
    expect(store.get().editTarget).toBe('zin');
    store.nextRound();
    expect(store.get().editTarget).toBe('zin');
  });

  it('refTarget for analoog mode is digital or zin', () => {
    const store = createGameStore();
    store.selectMode('analoog');
    store.selectMinutesLevel(4);
    store.selectHourMode('12h');
    expect(['digital', 'zin']).toContain(store.get().refTarget);
  });

  it('refTarget for digitaal mode is analog or zin', () => {
    const store = createGameStore();
    store.selectMode('digitaal');
    store.selectMinutesLevel(4);
    store.selectHourMode('12h');
    expect(['analog', 'zin']).toContain(store.get().refTarget);
  });

  it('refTarget for zin mode is analog or digital', () => {
    const store = createGameStore();
    store.selectMode('zin');
    store.selectMinutesLevel(4);
    store.selectHourMode('12h');
    expect(['analog', 'digital']).toContain(store.get().refTarget);
  });

  it('zin mode: check marks correct when editTime matches referenceTime', () => {
    const store = createGameStore();
    store.selectMode('zin');
    store.selectMinutesLevel(4);
    store.selectHourMode('12h');
    const { referenceTime } = store.get();
    store.setEditTime(referenceTime);
    store.check();
    expect(store.get().checked).toBe(true);
    expect(store.get().correct).toBe(true);
  });

  it('zin mode: check marks incorrect when editTime does not match referenceTime', () => {
    const store = createGameStore();
    store.selectMode('zin');
    store.selectMinutesLevel(4);
    store.selectHourMode('12h');
    const { referenceTime } = store.get();
    const refH = referenceTime.hours % 12;
    const wrongTime = { hours: refH === 1 ? 2 : 1, minutes: referenceTime.minutes === 0 ? 5 : 0 };
    store.setEditTime(wrongTime);
    store.check();
    expect(store.get().checked).toBe(true);
    expect(store.get().correct).toBe(false);
  });
});
