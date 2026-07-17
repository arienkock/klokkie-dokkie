import { describe, it, expect } from 'vitest';
import {
  CONCEPTS, LADDERS, REPRESENTATIONS, getConcept,
  randomHour12, randomHour24, randomHourAny, randomMinutesFor,
} from '../src/concepts.js';

describe('ladders', () => {
  it('analog and zin ladders have 6 rungs without uur_24', () => {
    expect(LADDERS.analog).toHaveLength(6);
    expect(LADDERS.zin).toHaveLength(6);
    expect(LADDERS.analog).not.toContain('uur_24');
    expect(LADDERS.zin).not.toContain('uur_24');
  });

  it('digital ladder has 7 rungs with uur_24 after kwartier', () => {
    expect(LADDERS.digital).toHaveLength(7);
    expect(LADDERS.digital.indexOf('uur_24')).toBe(LADDERS.digital.indexOf('kwartier') + 1);
    expect(LADDERS.digital.indexOf('uur_24')).toBe(LADDERS.digital.indexOf('voor_half') - 1);
  });

  it('every ladder rung is a defined concept', () => {
    for (const rep of REPRESENTATIONS) {
      for (const id of LADDERS[rep]) expect(getConcept(id)).toBeDefined();
    }
  });
});

describe('minute generators', () => {
  const expectAll = (conceptId, allowed) => {
    for (let i = 0; i < 200; i++) {
      expect(allowed).toContain(randomMinutesFor(conceptId));
    }
  };

  it('heel_uur always 0', () => expectAll('heel_uur', [0]));
  it('half_uur always 30', () => expectAll('half_uur', [30]));
  it('kwartier is 15 or 45', () => expectAll('kwartier', [15, 45]));
  it('voor_half covers the first half hour without quarters', () =>
    expectAll('voor_half', [5, 10, 20, 25]));
  it('na_half covers the second half hour without quarters', () =>
    expectAll('na_half', [35, 40, 50, 55]));

  it('vrij is never a multiple of 5', () => {
    for (let i = 0; i < 200; i++) {
      const m = randomMinutesFor('vrij');
      expect(m % 5).not.toBe(0);
      expect(m).toBeGreaterThanOrEqual(0);
      expect(m).toBeLessThan(60);
    }
  });

  it('every concept except uur_24 has a minute generator', () => {
    for (const c of CONCEPTS) {
      if (c.id === 'uur_24') expect(c.randomMinutes).toBeNull();
      else expect(typeof c.randomMinutes).toBe('function');
    }
  });
});

describe('hour generators', () => {
  it('randomHour12 stays within 1-12', () => {
    for (let i = 0; i < 200; i++) {
      const h = randomHour12();
      expect(h).toBeGreaterThanOrEqual(1);
      expect(h).toBeLessThanOrEqual(12);
    }
  });

  it('randomHour24 stays within 13-23', () => {
    for (let i = 0; i < 200; i++) {
      const h = randomHour24();
      expect(h).toBeGreaterThanOrEqual(13);
      expect(h).toBeLessThanOrEqual(23);
    }
  });

  it('randomHourAny stays within 1-23', () => {
    for (let i = 0; i < 200; i++) {
      const h = randomHourAny();
      expect(h).toBeGreaterThanOrEqual(1);
      expect(h).toBeLessThanOrEqual(23);
    }
  });
});

describe('analog editing config', () => {
  it('heel_uur locks the minute hand', () => {
    const c = getConcept('heel_uur');
    expect(c.minuteHandFree).toBe(false);
    expect(c.initialEditTime).toEqual({ hours: 1, minutes: 0 });
  });

  it('snap follows the concept granularity', () => {
    expect(getConcept('half_uur').minuteSnap).toBe(30);
    expect(getConcept('kwartier').minuteSnap).toBe(15);
    expect(getConcept('voor_half').minuteSnap).toBe(5);
    expect(getConcept('na_half').minuteSnap).toBe(5);
    expect(getConcept('uur_24').minuteSnap).toBe(5);
    expect(getConcept('vrij').minuteSnap).toBe(1);
  });
});
