import { describe, it, expect } from 'vitest';
import { timeToZin, zinToWords, generateTray } from '../src/utils/zinnen.js';

describe('timeToZin', () => {
  it('volle uren: "X uur"', () => {
    expect(timeToZin(3, 0)).toBe('drie uur');
    expect(timeToZin(12, 0)).toBe('twaalf uur');
    expect(timeToZin(0, 0)).toBe('twaalf uur');
  });

  it('minuten 1-4: "N over uur"', () => {
    expect(timeToZin(5, 1)).toBe('één over vijf');
    expect(timeToZin(5, 2)).toBe('twee over vijf');
    expect(timeToZin(5, 3)).toBe('drie over vijf');
    expect(timeToZin(5, 4)).toBe('vier over vijf');
  });

  it('vijf over', () => {
    expect(timeToZin(5, 5)).toBe('vijf over vijf');
  });

  it('tien over', () => {
    expect(timeToZin(5, 10)).toBe('tien over vijf');
  });

  it('kwart over', () => {
    expect(timeToZin(5, 15)).toBe('kwart over vijf');
  });

  it('tien voor half', () => {
    expect(timeToZin(5, 20)).toBe('tien voor half zes');
  });

  it('vijf voor half', () => {
    expect(timeToZin(5, 25)).toBe('vijf voor half zes');
  });

  it('half', () => {
    expect(timeToZin(5, 30)).toBe('half zes');
  });

  it('vijf over half', () => {
    expect(timeToZin(5, 35)).toBe('vijf over half zes');
  });

  it('tien over half', () => {
    expect(timeToZin(5, 40)).toBe('tien over half zes');
  });

  it('kwart voor', () => {
    expect(timeToZin(5, 45)).toBe('kwart voor zes');
  });

  it('tien voor', () => {
    expect(timeToZin(5, 50)).toBe('tien voor zes');
  });

  it('vijf voor', () => {
    expect(timeToZin(5, 55)).toBe('vijf voor zes');
  });

  it('24-uurs tijd wordt omgezet naar 12-uurs', () => {
    expect(timeToZin(14, 0)).toBe('twee uur');
    expect(timeToZin(17, 30)).toBe('half zes');
    expect(timeToZin(23, 45)).toBe('kwart voor twaalf');
  });

  it('uur 12 → twaalf, volgende → één', () => {
    expect(timeToZin(12, 30)).toBe('half één');
    expect(timeToZin(12, 45)).toBe('kwart voor één');
  });

  it('uur 11, volgende → twaalf', () => {
    expect(timeToZin(11, 30)).toBe('half twaalf');
  });

  it('arbitraire minuten (niveau 4)', () => {
    expect(timeToZin(3, 7)).toBe('zeven over drie');
    expect(timeToZin(3, 22)).toBe('acht voor half vier');
    expect(timeToZin(3, 37)).toBe('zeven over half vier');
    expect(timeToZin(3, 52)).toBe('acht voor vier');
  });
});

describe('zinToWords', () => {
  it('splitst zin in woorden', () => {
    expect(zinToWords('kwart over vijf')).toEqual(['kwart', 'over', 'vijf']);
    expect(zinToWords('half zes')).toEqual(['half', 'zes']);
    expect(zinToWords('tien voor half acht')).toEqual(['tien', 'voor', 'half', 'acht']);
    expect(zinToWords('drie uur')).toEqual(['drie', 'uur']);
  });
});

describe('generateTray', () => {
  it('bevat alle correcte woorden', () => {
    const correct = ['kwart', 'over', 'vijf'];
    const tray = generateTray(correct);
    expect(correct.every(w => tray.includes(w))).toBe(true);
  });

  it('voegt 2-4 confounders toe', () => {
    for (const correct of [['half', 'zes'], ['kwart', 'voor', 'acht'], ['tien', 'voor', 'half', 'negen']]) {
      const tray = generateTray(correct);
      const extra = tray.length - correct.length;
      expect(extra).toBeGreaterThanOrEqual(2);
      expect(extra).toBeLessThanOrEqual(4);
    }
  });

  it('confounders zijn geen correcte woorden', () => {
    const correct = ['kwart', 'over', 'vijf'];
    const correctSet = new Set(correct);
    for (let i = 0; i < 10; i++) {
      const tray = generateTray(correct);
      const confounders = tray.filter(w => !correctSet.has(w));
      confounders.forEach(c => expect(correct).not.toContain(c));
    }
  });

  it('tray is geshuffled (niet altijd in dezelfde volgorde)', () => {
    const correct = ['tien', 'voor', 'half', 'vier'];
    const orders = new Set();
    for (let i = 0; i < 20; i++) orders.add(generateTray(correct).join(','));
    expect(orders.size).toBeGreaterThan(1);
  });
});
