import { describe, it, expect } from 'vitest';
import { createAdaptiveEngine } from '../src/core/engine/index.js';

// Clock-agnostic: drive the engine with a synthetic two-track config to prove
// it has no clock coupling. No clock terms/imports appear here.
const makeEngine = () => createAdaptiveEngine({
  tracks: [
    { id: 'a', ladder: ['r1', 'r2', 'r3'] },
    { id: 'b', ladder: ['r1', 'r2'] },
  ],
});

const answerN = (engine, matrix, track, rungId, role, results) => {
  let m = matrix, events = [];
  for (const correct of results) {
    const r = engine.recordAnswer(m, track, rungId, role, correct);
    m = r.matrix;
    events.push(...r.events);
  }
  return { matrix: m, events };
};

describe('createMatrix', () => {
  it('builds a fresh unmastered cell per track × rung', () => {
    const engine = makeEngine();
    const m = engine.createMatrix();
    expect(Object.keys(m).sort()).toEqual(['a', 'b']);
    expect(Object.keys(m.a)).toEqual(['r1', 'r2', 'r3']);
    expect(Object.keys(m.b)).toEqual(['r1', 'r2']);
    expect(m.a.r1).toEqual({ mastered: false, window: [], review: [] });
  });
});

describe('frontierFor', () => {
  it('starts at the first rung and advances after mastery', () => {
    const engine = makeEngine();
    let m = engine.createMatrix();
    expect(engine.frontierFor(m, 'a')).toBe('r1');
    m = answerN(engine, m, 'a', 'r1', 'frontier', [true, true, true]).matrix;
    expect(engine.frontierFor(m, 'a')).toBe('r2');
  });
});

describe('recordAnswer + masteredRungs', () => {
  it('fast-tracks promotion after 3 straight correct with a mastered event', () => {
    const engine = makeEngine();
    const { matrix, events } = answerN(engine, engine.createMatrix(), 'a', 'r1', 'frontier', [true, true, true]);
    expect(matrix.a.r1.mastered).toBe(true);
    expect(events).toEqual([{ type: 'mastered', rep: 'a', conceptId: 'r1' }]);
    expect(engine.masteredRungs(matrix, 'a')).toEqual(['r1']);
  });
});

describe('chooseRungAndRole', () => {
  it('returns a frontier choice on a fresh matrix', () => {
    const engine = makeEngine();
    const choice = engine.chooseRungAndRole(engine.createMatrix(), 'a', () => 0.99, [], []);
    expect(choice).toEqual({ rungId: 'r1', role: 'frontier' });
  });

  it('returns a review choice when a review pool is supplied and rng forces it', () => {
    const engine = makeEngine();
    const m = answerN(engine, engine.createMatrix(), 'a', 'r1', 'frontier', [true, true, true]).matrix;
    // rng() = 0.99 exceeds any frontier share, so the review branch is taken.
    const choice = engine.chooseRungAndRole(m, 'a', () => 0.99, [], ['r1']);
    expect(choice).toEqual({ rungId: 'r1', role: 'review' });
  });
});
