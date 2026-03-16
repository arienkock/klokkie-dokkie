import { describe, it, expect } from 'vitest';
import {
  pad2,
  hoursToAngle,
  minutesToAngle,
  angleToMinutes,
  angleToHours12,
  pointAngle,
  handEndpoint,
  snapTo,
} from '../src/utils/time.js';

describe('pad2', () => {
  it('pads single digit', () => {
    expect(pad2(0)).toBe('00');
    expect(pad2(5)).toBe('05');
    expect(pad2(9)).toBe('09');
  });

  it('does not pad two-digit numbers', () => {
    expect(pad2(10)).toBe('10');
    expect(pad2(59)).toBe('59');
  });
});

describe('hoursToAngle', () => {
  it('12 oclock is 0 degrees', () => {
    expect(hoursToAngle(0, 0)).toBe(0);
    expect(hoursToAngle(12, 0)).toBe(0);
  });

  it('3 oclock is 90 degrees', () => {
    expect(hoursToAngle(3, 0)).toBe(90);
  });

  it('6 oclock is 180 degrees', () => {
    expect(hoursToAngle(6, 0)).toBe(180);
  });

  it('minute offset shifts hour hand', () => {
    expect(hoursToAngle(12, 30)).toBe(15);
  });
});

describe('minutesToAngle', () => {
  it('0 minutes is 0 degrees', () => {
    expect(minutesToAngle(0)).toBe(0);
  });

  it('15 minutes is 90 degrees', () => {
    expect(minutesToAngle(15)).toBe(90);
  });

  it('30 minutes is 180 degrees', () => {
    expect(minutesToAngle(30)).toBe(180);
  });

  it('60 minutes is 360 degrees', () => {
    expect(minutesToAngle(60)).toBe(360);
  });
});

describe('angleToMinutes', () => {
  it('0 degrees is 0 minutes', () => {
    expect(angleToMinutes(0)).toBe(0);
  });

  it('180 degrees is 30 minutes', () => {
    expect(angleToMinutes(180)).toBe(30);
  });

  it('360 degrees wraps to 0', () => {
    expect(angleToMinutes(360)).toBe(0);
  });

  it('negative angles wrap correctly', () => {
    expect(angleToMinutes(-6)).toBe(59);
  });
});

describe('angleToHours12', () => {
  it('0 degrees is 12 (0)', () => {
    expect(angleToHours12(0)).toBe(0);
  });

  it('90 degrees is 3', () => {
    expect(angleToHours12(90)).toBe(3);
  });

  it('180 degrees is 6', () => {
    expect(angleToHours12(180)).toBe(6);
  });

  it('360 degrees wraps to 0', () => {
    expect(angleToHours12(360)).toBe(0);
  });
});

describe('pointAngle', () => {
  it('returns 0 for 12 oclock direction', () => {
    expect(pointAngle(100, 100, 100, 0)).toBeCloseTo(0);
  });

  it('returns 90 for 3 oclock direction', () => {
    expect(pointAngle(100, 100, 200, 100)).toBeCloseTo(90);
  });

  it('returns 180 for 6 oclock direction', () => {
    expect(pointAngle(100, 100, 100, 200)).toBeCloseTo(180);
  });

  it('returns 270 for 9 oclock direction', () => {
    expect(pointAngle(100, 100, 0, 100)).toBeCloseTo(270);
  });
});

describe('handEndpoint', () => {
  it('0 degrees points up from center', () => {
    const { x, y } = handEndpoint(0, 50);
    expect(x).toBeCloseTo(100);
    expect(y).toBeCloseTo(50);
  });

  it('180 degrees points down from center', () => {
    const { x, y } = handEndpoint(180, 50);
    expect(x).toBeCloseTo(100);
    expect(y).toBeCloseTo(150);
  });

  it('90 degrees points right from center', () => {
    const { x, y } = handEndpoint(90, 50);
    expect(x).toBeCloseTo(150);
    expect(y).toBeCloseTo(100);
  });
});

describe('snapTo', () => {
  it('returns value unchanged when snap is 1', () => {
    expect(snapTo(7, 1)).toBe(7);
    expect(snapTo(23, 1)).toBe(23);
  });

  it('snaps to nearest multiple of 5', () => {
    expect(snapTo(0, 5)).toBe(0);
    expect(snapTo(5, 5)).toBe(5);
    expect(snapTo(7, 5)).toBe(5);
    expect(snapTo(8, 5)).toBe(10);
    expect(snapTo(55, 5)).toBe(55);
  });

  it('wraps at 60 using modulo', () => {
    expect(snapTo(58, 5)).toBe(0);
    expect(snapTo(57, 5)).toBe(55);
  });

  it('handles exact multiples without change', () => {
    for (let m = 0; m <= 55; m += 5) {
      expect(snapTo(m, 5)).toBe(m);
    }
  });
});
