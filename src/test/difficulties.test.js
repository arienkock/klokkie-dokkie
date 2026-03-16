import { describe, it, expect } from 'vitest';
import { DIFFICULTIES, getDifficulty } from '../src/difficulties.js';

describe('DIFFICULTIES', () => {
  it('has 4 levels', () => {
    expect(DIFFICULTIES).toHaveLength(4);
  });

  it('each level has required shape', () => {
    for (const d of DIFFICULTIES) {
      expect(typeof d.id).toBe('number');
      expect(typeof d.label).toBe('string');
      expect(typeof d.sublabel).toBe('string');
      expect(typeof d.minuteHandFree).toBe('boolean');
      expect(typeof d.initialEditTime).toBe('object');
      expect(typeof d.randomTime).toBe('function');
    }
  });

  it('ids are 1 through 4', () => {
    expect(DIFFICULTIES.map(d => d.id)).toEqual([1, 2, 3, 4]);
  });

  it('level 1 has minuteHandFree false', () => {
    expect(getDifficulty(1).minuteHandFree).toBe(false);
  });

  it('levels 2-4 have minuteHandFree true', () => {
    expect(getDifficulty(2).minuteHandFree).toBe(true);
    expect(getDifficulty(3).minuteHandFree).toBe(true);
    expect(getDifficulty(4).minuteHandFree).toBe(true);
  });

  it('level 1 initialEditTime is 01:00', () => {
    expect(getDifficulty(1).initialEditTime).toEqual({ hours: 1, minutes: 0 });
  });

  it('level 1 randomTime always returns minutes 0', () => {
    const diff = getDifficulty(1);
    for (let i = 0; i < 20; i++) {
      expect(diff.randomTime().minutes).toBe(0);
    }
  });

  it('level 2 randomTime always returns minutes as multiples of 5 up to 30', () => {
    const diff = getDifficulty(2);
    for (let i = 0; i < 40; i++) {
      const { minutes } = diff.randomTime();
      expect(minutes % 5).toBe(0);
      expect(minutes).toBeGreaterThanOrEqual(0);
      expect(minutes).toBeLessThanOrEqual(30);
    }
  });

  it('level 3 randomTime always returns minutes as multiples of 5', () => {
    const diff = getDifficulty(3);
    for (let i = 0; i < 40; i++) {
      const { minutes } = diff.randomTime();
      expect(minutes % 5).toBe(0);
      expect(minutes).toBeGreaterThanOrEqual(0);
      expect(minutes).toBeLessThanOrEqual(55);
    }
  });
});

describe('getDifficulty', () => {
  it('returns the correct difficulty by id', () => {
    expect(getDifficulty(1).label).toBe('Volle uren');
    expect(getDifficulty(4).label).toBe('Vrij');
  });

  it('returns undefined for unknown id', () => {
    expect(getDifficulty(99)).toBeUndefined();
  });
});
