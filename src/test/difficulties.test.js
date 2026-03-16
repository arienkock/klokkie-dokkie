import { describe, it, expect } from 'vitest';
import { MINUTE_LEVELS, HOUR_MODES, getMinuteLevel, getHourMode, getDifficulty } from '../src/difficulties.js';

describe('MINUTE_LEVELS', () => {
  it('has 4 levels', () => {
    expect(MINUTE_LEVELS).toHaveLength(4);
  });

  it('each level has required shape', () => {
    for (const d of MINUTE_LEVELS) {
      expect(typeof d.id).toBe('number');
      expect(typeof d.label).toBe('string');
      expect(typeof d.sublabel).toBe('string');
      expect(typeof d.minuteHandFree).toBe('boolean');
      expect(typeof d.minuteSnap).toBe('number');
      expect(typeof d.initialEditTime).toBe('object');
      expect(typeof d.randomMinutes).toBe('function');
    }
  });

  it('levels 2 and 3 have minuteSnap of 5', () => {
    expect(getMinuteLevel(2).minuteSnap).toBe(5);
    expect(getMinuteLevel(3).minuteSnap).toBe(5);
  });

  it('levels 1 and 4 have minuteSnap of 1', () => {
    expect(getMinuteLevel(1).minuteSnap).toBe(1);
    expect(getMinuteLevel(4).minuteSnap).toBe(1);
  });

  it('ids are 1 through 4', () => {
    expect(MINUTE_LEVELS.map(d => d.id)).toEqual([1, 2, 3, 4]);
  });

  it('level 1 has minuteHandFree false', () => {
    expect(getMinuteLevel(1).minuteHandFree).toBe(false);
  });

  it('levels 2-4 have minuteHandFree true', () => {
    expect(getMinuteLevel(2).minuteHandFree).toBe(true);
    expect(getMinuteLevel(3).minuteHandFree).toBe(true);
    expect(getMinuteLevel(4).minuteHandFree).toBe(true);
  });

  it('level 1 initialEditTime is 01:00', () => {
    expect(getMinuteLevel(1).initialEditTime).toEqual({ hours: 1, minutes: 0 });
  });

  it('level 1 randomMinutes always returns 0', () => {
    const level = getMinuteLevel(1);
    for (let i = 0; i < 20; i++) {
      expect(level.randomMinutes()).toBe(0);
    }
  });

  it('level 2 randomMinutes always returns multiples of 5 up to 30', () => {
    const level = getMinuteLevel(2);
    for (let i = 0; i < 40; i++) {
      const minutes = level.randomMinutes();
      expect(minutes % 5).toBe(0);
      expect(minutes).toBeGreaterThanOrEqual(0);
      expect(minutes).toBeLessThanOrEqual(30);
    }
  });

  it('level 3 randomMinutes always returns multiples of 5', () => {
    const level = getMinuteLevel(3);
    for (let i = 0; i < 40; i++) {
      const minutes = level.randomMinutes();
      expect(minutes % 5).toBe(0);
      expect(minutes).toBeGreaterThanOrEqual(0);
      expect(minutes).toBeLessThanOrEqual(55);
    }
  });
});

describe('HOUR_MODES', () => {
  it('has 2 modes', () => {
    expect(HOUR_MODES).toHaveLength(2);
  });

  it('12h mode generates hours 1-12', () => {
    const mode = getHourMode('12h');
    for (let i = 0; i < 40; i++) {
      const h = mode.randomHour();
      expect(h).toBeGreaterThanOrEqual(1);
      expect(h).toBeLessThanOrEqual(12);
    }
  });

  it('24h mode generates hours 1-23', () => {
    const mode = getHourMode('24h');
    for (let i = 0; i < 40; i++) {
      const h = mode.randomHour();
      expect(h).toBeGreaterThanOrEqual(1);
      expect(h).toBeLessThanOrEqual(23);
    }
  });
});

describe('getDifficulty', () => {
  it('returns object with minuteHandFree, minuteSnap, initialEditTime, randomTime', () => {
    const diff = getDifficulty(1, '12h');
    expect(typeof diff.minuteHandFree).toBe('boolean');
    expect(typeof diff.minuteSnap).toBe('number');
    expect(typeof diff.initialEditTime).toBe('object');
    expect(typeof diff.randomTime).toBe('function');
  });

  it('level 3 getDifficulty exposes minuteSnap 5', () => {
    expect(getDifficulty(3, '12h').minuteSnap).toBe(5);
  });

  it('level 4 getDifficulty exposes minuteSnap 1', () => {
    expect(getDifficulty(4, '12h').minuteSnap).toBe(1);
  });

  it('level 1 + 12h: randomTime returns hours 1-12 and minutes 0', () => {
    const diff = getDifficulty(1, '12h');
    for (let i = 0; i < 20; i++) {
      const { hours, minutes } = diff.randomTime();
      expect(hours).toBeGreaterThanOrEqual(1);
      expect(hours).toBeLessThanOrEqual(12);
      expect(minutes).toBe(0);
    }
  });

  it('level 1 + 24h: randomTime returns hours 1-23 and minutes 0', () => {
    const diff = getDifficulty(1, '24h');
    for (let i = 0; i < 20; i++) {
      const { hours, minutes } = diff.randomTime();
      expect(hours).toBeGreaterThanOrEqual(1);
      expect(hours).toBeLessThanOrEqual(23);
      expect(minutes).toBe(0);
    }
  });

  it('level 4 + 24h: minuteHandFree is true', () => {
    expect(getDifficulty(4, '24h').minuteHandFree).toBe(true);
  });
});
