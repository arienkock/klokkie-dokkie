import { describe, it, expect, beforeEach } from 'vitest';
import { createStore, createGameStore, gameKey, getOptionStatus } from '../src/store.js';

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

describe('gameKey', () => {
  it('produces a string key from mode, level, hourMode', () => {
    expect(gameKey('analoog', 1, '12h')).toBe('analoog-1-12h');
    expect(gameKey('alles', 4, '24h')).toBe('alles-4-24h');
  });
});

describe('getOptionStatus', () => {
  it('returns null when no scores exist for mode', () => {
    expect(getOptionStatus({}, 'analoog')).toBeNull();
  });

  it('returns completed=true if any config for that mode is completed', () => {
    const scores = { 'analoog-1-12h': { completed: true, percentage: 95 } };
    const status = getOptionStatus(scores, 'analoog');
    expect(status.completed).toBe(true);
    expect(status.percentage).toBe(95);
  });

  it('returns completed=false if no config completed', () => {
    const scores = { 'analoog-2-12h': { completed: false, percentage: 70 } };
    const status = getOptionStatus(scores, 'analoog');
    expect(status.completed).toBe(false);
    expect(status.percentage).toBe(70);
  });

  it('filters by level when provided', () => {
    const scores = {
      'analoog-1-12h': { completed: true, percentage: 95 },
      'analoog-2-12h': { completed: false, percentage: 60 },
    };
    const status = getOptionStatus(scores, 'analoog', 2);
    expect(status.completed).toBe(false);
    expect(status.percentage).toBe(60);
  });

  it('returns exact entry when mode+level+hourMode provided', () => {
    const scores = { 'digitaal-3-24h': { completed: false, percentage: 50 } };
    const status = getOptionStatus(scores, 'digitaal', 3, '24h');
    expect(status.completed).toBe(false);
    expect(status.percentage).toBe(50);
  });
});

describe('createGameStore', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts on mode-select screen', () => {
    const store = createGameStore();
    expect(store.get().screen).toBe('mode-select');
  });

  it('goToModeSelect changes screen', () => {
    const store = createGameStore();
    store.selectMode('analoog');
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
    expect(state.sessionHistory).toEqual([]);
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

  it('check records answer in sessionHistory', () => {
    const store = createGameStore();
    store.selectMode('analoog');
    store.selectMinutesLevel(4);
    store.selectHourMode('12h');
    const { referenceTime } = store.get();
    store.setEditTime(referenceTime);
    store.check();
    expect(store.get().sessionHistory).toEqual([true]);
  });

  it('check updates scores with percentage', () => {
    const store = createGameStore();
    store.selectMode('analoog');
    store.selectMinutesLevel(1);
    store.selectHourMode('12h');
    const { referenceTime } = store.get();
    store.setEditTime(referenceTime);
    store.check();
    const { scores, currentGameKey } = store.get();
    expect(scores[currentGameKey]).toBeDefined();
    expect(scores[currentGameKey].percentage).toBe(100);
  });

  it('game completes after 20 answers with 90%+ correct', () => {
    const store = createGameStore();
    store.selectMode('analoog');
    store.selectMinutesLevel(1);
    store.selectHourMode('12h');

    for (let i = 0; i < 20; i++) {
      const { referenceTime } = store.get();
      store.setEditTime(referenceTime);
      store.check();
      if (store.get().screen !== 'game-complete') store.nextRound();
    }
    expect(store.get().screen).toBe('game-complete');
  });

  it('game does not complete with fewer than 20 answers', () => {
    const store = createGameStore();
    store.selectMode('analoog');
    store.selectMinutesLevel(1);
    store.selectHourMode('12h');

    for (let i = 0; i < 19; i++) {
      const { referenceTime } = store.get();
      store.setEditTime(referenceTime);
      store.check();
      store.nextRound();
    }
    expect(store.get().screen).toBe('game');
  });

  it('completed game persists completed=true in scores', () => {
    const store = createGameStore();
    store.selectMode('analoog');
    store.selectMinutesLevel(1);
    store.selectHourMode('12h');

    for (let i = 0; i < 20; i++) {
      const { referenceTime } = store.get();
      store.setEditTime(referenceTime);
      store.check();
      if (store.get().screen !== 'game-complete') store.nextRound();
    }
    const { scores, currentGameKey } = store.get();
    expect(scores[currentGameKey].completed).toBe(true);
  });

  it('goToMinutesSelect changes screen', () => {
    const store = createGameStore();
    store.selectMode('alles');
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

  it('editTarget for alles mode is one of the three component types', () => {
    const store = createGameStore();
    store.selectMode('alles');
    store.selectMinutesLevel(4);
    store.selectHourMode('12h');
    const valid = ['analog', 'digital', 'zin'];
    expect(valid).toContain(store.get().editTarget);
    store.nextRound();
    expect(valid).toContain(store.get().editTarget);
  });

  it('editTarget and refTarget are always different', () => {
    const store = createGameStore();
    for (const mode of ['analoog', 'digitaal', 'zin', 'alles']) {
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

  describe('adaptive mode', () => {
    it('selectAdaptive starts at level 0 (minuteLevel 1, hourMode 12h)', () => {
      const store = createGameStore();
      store.selectMode('analoog');
      store.selectAdaptive();
      const state = store.get();
      expect(state.adaptive).toBe(true);
      expect(state.adaptiveLevel).toBe(0);
      expect(state.minutesLevel).toBe(1);
      expect(state.hourMode).toBe('12h');
    });

    it('selectAdaptive sets screen to game with correct game key', () => {
      const store = createGameStore();
      store.selectMode('analoog');
      store.selectAdaptive();
      const state = store.get();
      expect(state.screen).toBe('game');
      expect(state.currentGameKey).toBe('analoog-adaptive');
    });

    it('correct answer in adaptive mode advances level by 2', () => {
      const store = createGameStore();
      store.selectMode('analoog');
      store.selectAdaptive();
      const { referenceTime } = store.get();
      store.setEditTime(referenceTime);
      store.check();
      expect(store.get().adaptiveLevel).toBe(2);
    });

    it('incorrect answer in adaptive mode decreases level by 1', () => {
      const store = createGameStore();
      store.selectMode('analoog');
      store.selectAdaptive();
      // Start at level 2 by answering correctly once first
      const { referenceTime: rt1 } = store.get();
      store.setEditTime(rt1);
      store.check();
      store.nextRound();
      // Now answer incorrectly
      const { referenceTime } = store.get();
      const wrongTime = { hours: referenceTime.hours === 1 ? 2 : 1, minutes: 30 };
      store.setEditTime(wrongTime);
      store.check();
      expect(store.get().adaptiveLevel).toBe(1);
    });

    it('adaptive level is clamped at max (7)', () => {
      const store = createGameStore();
      store.selectMode('analoog');
      store.selectAdaptive();
      // Answer correctly 4 times to try to go past 7
      for (let i = 0; i < 4; i++) {
        const { referenceTime } = store.get();
        store.setEditTime(referenceTime);
        store.check();
        if (store.get().screen !== 'game-complete') store.nextRound();
      }
      expect(store.get().adaptiveLevel).toBeLessThanOrEqual(7);
    });

    it('adaptive level is floored at 0 when already at minimum', () => {
      const store = createGameStore();
      store.selectMode('analoog');
      store.selectAdaptive();
      const { referenceTime } = store.get();
      const wrongTime = { hours: referenceTime.hours === 1 ? 2 : 1, minutes: 30 };
      store.setEditTime(wrongTime);
      store.check();
      expect(store.get().adaptiveLevel).toBe(0);
    });

    it('minutesLevel and hourMode update after adaptive level change', () => {
      const store = createGameStore();
      store.selectMode('analoog');
      store.selectAdaptive();
      const { referenceTime } = store.get();
      store.setEditTime(referenceTime);
      store.check();
      const state = store.get();
      // level 2 => ADAPTIVE_LEVELS[2] = { minuteLevelId: 2, hourModeId: '12h' }
      expect(state.minutesLevel).toBe(2);
      expect(state.hourMode).toBe('12h');
    });

    it('adaptive level is persisted to localStorage and restored on next session', () => {
      const store1 = createGameStore();
      store1.selectMode('digitaal');
      store1.selectAdaptive();
      const { referenceTime } = store1.get();
      store1.setEditTime(referenceTime);
      store1.check(); // level advances to 2

      const store2 = createGameStore();
      store2.selectMode('digitaal');
      store2.selectAdaptive();
      expect(store2.get().adaptiveLevel).toBe(2);
    });

    it('adaptive persistence is per game mode', () => {
      const store1 = createGameStore();
      store1.selectMode('analoog');
      store1.selectAdaptive();
      const { referenceTime } = store1.get();
      store1.setEditTime(referenceTime);
      store1.check(); // analoog advances to 2

      const store2 = createGameStore();
      store2.selectMode('digitaal');
      store2.selectAdaptive();
      expect(store2.get().adaptiveLevel).toBe(0); // different mode starts fresh
    });
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
