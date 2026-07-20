// Smoke test: drive the UNCHANGED core with the arithmetic domain. No clock
// imports anywhere — this is the acceptance proof that the core is genuinely
// problem-type-agnostic.

import { describe, it, expect, beforeEach } from 'vitest';
import { createGame } from '../src/core/game/index.js';
import { arithmeticDomain, engine } from '../src/domains/arithmetic/index.js';
import { LADDER } from '../src/domains/arithmetic/rungs.js';

const makeStorage = () => ({
  store: {},
  getItem(k) { return k in this.store ? this.store[k] : null; },
  setItem(k, v) { this.store[k] = String(v); },
  removeItem(k) { delete this.store[k]; },
});

describe('arithmetic domain on the core', () => {
  let storage;
  let game;

  beforeEach(() => {
    storage = makeStorage();
    game = createGame({ engine, domain: arithmeticDomain, storage });
  });

  it('starts on setup with both tracks selected', () => {
    const s = game.get();
    expect(s.screen).toBe('setup');
    expect(s.selectedTracks.sort()).toEqual(['equation', 'story']);
  });

  it('starts a session with a single track (minTracks: 1) and a valid round', () => {
    game.toggleTrack('story'); // leave only 'equation'
    expect(game.get().selectedTracks).toEqual(['equation']);

    game.startSession();
    const s = game.get();
    expect(s.screen).toBe('game');
    expect(s.round.role).toBe('frontier');
    expect(LADDER).toContain(s.round.rungId);
    expect(typeof s.round.answer).toBe('number');
    expect(s.answerState).toBe('');
  });

  it('grades a correct answer, recording it in history and the matrix cell', () => {
    game.startSession();
    const { round } = game.get();
    game.setAnswer(String(round.answer));
    game.check();
    const s = game.get();
    expect(s.correct).toBe(true);
    expect(s.sessionHistory).toEqual([true]);
    const cell = s.matrix[round.attributionTrack][round.rungId];
    // frontier answers land in the window; a mastering promotion resets it, but
    // a single correct answer records [true].
    expect(cell.window).toEqual([true]);
  });

  it('grades a wrong answer as incorrect', () => {
    game.startSession();
    const { round } = game.get();
    game.setAnswer(String(round.answer + 1));
    game.check();
    expect(game.get().correct).toBe(false);
  });

  it('masters a rung when the frontier is answered correctly repeatedly', () => {
    game.startSession();

    let mastered = false;
    // Answer the current frontier correctly; adaptivity should eventually
    // promote a rung (frontier advances or a mastery celebration fires).
    for (let i = 0; i < 200 && !mastered; i++) {
      const s = game.get();
      if (s.screen === 'session-end') { game.startSession(); continue; }
      if (s.screen === 'celebration') { mastered = true; break; }
      if (s.screen !== 'game') break;

      const { round } = s;
      game.setAnswer(String(round.answer));
      game.check();
      if (game.get().pendingMastery) { mastered = true; break; }
      game.nextRound();
      if (game.get().screen === 'celebration') { mastered = true; break; }
    }

    expect(mastered).toBe(true);
  });
});
