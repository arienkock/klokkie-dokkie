import { describe, it, expect } from 'vitest';
import {
  createMatrix, normalizeMatrix, frontierFor, masteredMinuteConcepts,
  isStruggling, frontierShare, sessionShare, recordAnswer, pickRound,
} from '../src/mastery.js';
import { LADDERS, REPRESENTATIONS, getConcept } from '../src/concepts.js';

const CONCEPT_MINUTES = {
  heel_uur: [0],
  half_uur: [30],
  kwartier: [15, 45],
  voor_half: [5, 10, 20, 25],
  na_half: [35, 40, 50, 55],
};

const minutesMatch = (conceptId, m) =>
  conceptId === 'vrij' ? m % 5 !== 0 : CONCEPT_MINUTES[conceptId].includes(m);

// Apply n frontier answers to a matrix cell, returning the final matrix.
const answerN = (matrix, rep, conceptId, role, results) => {
  let m = matrix, allEvents = [];
  for (const correct of results) {
    const r = recordAnswer(m, rep, conceptId, role, correct);
    m = r.matrix;
    allEvents.push(...r.events);
  }
  return { matrix: m, events: allEvents };
};

const masterUpTo = (matrix, rep, conceptId) => {
  let m = matrix;
  for (const id of LADDERS[rep]) {
    m = answerN(m, rep, id, 'frontier', [true, true, true, true, true]).matrix;
    if (id === conceptId) break;
  }
  return m;
};

describe('createMatrix / normalizeMatrix', () => {
  it('creates a fresh unmastered cell per representation × ladder rung', () => {
    const m = createMatrix();
    expect(Object.keys(m).sort()).toEqual([...REPRESENTATIONS].sort());
    expect(Object.keys(m.digital)).toEqual(LADDERS.digital);
    expect(Object.keys(m.analog)).toEqual(LADDERS.analog);
    expect(m.analog.uur_24).toBeUndefined();
    expect(m.digital.uur_24).toEqual({ mastered: false, window: [], review: [] });
  });

  it('normalizeMatrix tolerates garbage and keeps valid cells', () => {
    expect(normalizeMatrix(null)).toEqual(createMatrix());
    expect(normalizeMatrix('nope')).toEqual(createMatrix());
    const m = normalizeMatrix({
      analog: { heel_uur: { mastered: true, window: [1, 0], review: 'bad' }, bogus: { mastered: true } },
      digital: 42,
    });
    expect(m.analog.heel_uur).toEqual({ mastered: true, window: [true, false], review: [] });
    expect(m.analog.bogus).toBeUndefined();
    expect(m.digital.heel_uur.mastered).toBe(false);
  });
});

describe('frontierFor', () => {
  it('starts at heel_uur and advances past mastered rungs', () => {
    let m = createMatrix();
    expect(frontierFor(m, 'analog')).toBe('heel_uur');
    m = answerN(m, 'analog', 'heel_uur', 'frontier', [true, true, true, true, true]).matrix;
    expect(frontierFor(m, 'analog')).toBe('half_uur');
  });

  it('returns null when the whole ladder is mastered', () => {
    const m = masterUpTo(createMatrix(), 'zin', 'vrij');
    expect(frontierFor(m, 'zin')).toBeNull();
  });

  it('digital ladder reaches uur_24 after kwartier', () => {
    const m = masterUpTo(createMatrix(), 'digital', 'kwartier');
    expect(frontierFor(m, 'digital')).toBe('uur_24');
  });
});

describe('promotion', () => {
  it('fast-tracks mastery after 3 straight correct frontier answers', () => {
    const two = answerN(createMatrix(), 'analog', 'heel_uur', 'frontier', [true, true]);
    expect(two.matrix.analog.heel_uur.mastered).toBe(false);
    expect(two.events).toEqual([]);
    const { matrix, events } = answerN(two.matrix, 'analog', 'heel_uur', 'frontier', [true]);
    expect(matrix.analog.heel_uur.mastered).toBe(true);
    expect(events).toEqual([{ type: 'mastered', rep: 'analog', conceptId: 'heel_uur' }]);
  });

  it('fast-tracks on a streak of 3 even after an earlier miss', () => {
    const { matrix, events } = answerN(createMatrix(), 'analog', 'heel_uur', 'frontier', [false, true, true, true]);
    expect(matrix.analog.heel_uur.mastered).toBe(true);
    expect(events).toEqual([{ type: 'mastered', rep: 'analog', conceptId: 'heel_uur' }]);
  });

  it('masters with 4 of last 5 correct, ending on a correct answer', () => {
    const { matrix, events } = answerN(createMatrix(), 'zin', 'heel_uur', 'frontier', [true, true, false, true]);
    expect(matrix.zin.heel_uur.mastered).toBe(false);
    const next = recordAnswer(matrix, 'zin', 'heel_uur', 'frontier', true);
    expect(next.matrix.zin.heel_uur.mastered).toBe(true);
    expect(next.events[0].type).toBe('mastered');
    expect(events).toEqual([]);
  });

  it('never promotes on a wrong answer even if the window qualifies', () => {
    const m = normalizeMatrix({
      analog: { heel_uur: { mastered: false, window: [true, true, true, true], review: [] } },
    });
    const { matrix, events } = answerN(m, 'analog', 'heel_uur', 'frontier', [false]);
    expect(matrix.analog.heel_uur.mastered).toBe(false);
    expect(events).toEqual([]);
  });

  it('resets windows on promotion', () => {
    const { matrix } = answerN(createMatrix(), 'analog', 'heel_uur', 'frontier', [true, true, true]);
    expect(matrix.analog.heel_uur.window).toEqual([]);
    expect(matrix.analog.heel_uur.review).toEqual([]);
  });

  it('ignores stale frontier answers for an already-mastered concept', () => {
    const m = masterUpTo(createMatrix(), 'analog', 'heel_uur');
    const { matrix, events } = answerN(m, 'analog', 'heel_uur', 'frontier', [true, true, true, true, true]);
    expect(events).toEqual([]);
    expect(matrix.analog.heel_uur.window).toEqual([]);
    expect(matrix.analog.heel_uur.mastered).toBe(true);
  });

  it('does not mutate the input matrix', () => {
    const m = createMatrix();
    recordAnswer(m, 'analog', 'heel_uur', 'frontier', true);
    expect(m.analog.heel_uur.window).toEqual([]);
  });
});

describe('sessionShare', () => {
  it('holds the default share during warm-up', () => {
    expect(sessionShare()).toBe(0.5);
    expect(sessionShare([])).toBe(0.5);
    expect(sessionShare([true, true, true])).toBe(0.5);
    expect(sessionShare([false, false, false])).toBe(0.5);
  });

  it('maps recent session accuracy to a frontier share', () => {
    expect(sessionShare([true, true, true, true])).toBe(0.85);
    expect(sessionShare([true, true, true, true, true, false])).toBe(0.5);
    expect(sessionShare([true, true, true, true, false, false])).toBe(0.35);
    expect(sessionShare([true, false, false, true, false, false])).toBe(0.2);
    expect(sessionShare([false, false, false, false, false, false])).toBe(0.2);
  });

  it('only looks at the last 6 session answers', () => {
    expect(sessionShare([false, false, false, true, true, true, true, true, true])).toBe(0.85);
  });
});

describe('frontier share / struggling', () => {
  it('defaults to 0.5 without session history', () => {
    expect(frontierShare({ mastered: false, window: [], review: [] })).toBe(0.5);
    expect(frontierShare({ mastered: false, window: [false, false, false], review: [] })).toBe(0.5);
  });

  it('follows the session share for a non-struggling cell', () => {
    const cell = { mastered: false, window: [], review: [] };
    expect(frontierShare(cell, [true, true, true, true])).toBe(0.85);
    expect(frontierShare(cell, [false, false, true, true])).toBe(0.35);
  });

  it('caps at 0.25 with ≥3 wrong in the last 4 frontier answers, even in a good session', () => {
    // last 4 = [false, false, false, true] → 3 wrong → struggling
    const struggling = { mastered: false, window: [true, false, false, false, true], review: [] };
    expect(isStruggling(struggling)).toBe(true);
    expect(frontierShare(struggling)).toBe(0.25);
    expect(frontierShare(struggling, [true, true, true, true, true, true])).toBe(0.25);
    // last 4 = [false, false, true, true] → 2 wrong → recovered
    const recovered = { mastered: false, window: [false, false, false, true, true], review: [] };
    expect(isStruggling(recovered)).toBe(false);
    expect(frontierShare(recovered)).toBe(0.5);
  });

  it('a struggling cell keeps the lower of the two shares', () => {
    const struggling = { mastered: false, window: [false, false, false, true], review: [] };
    expect(frontierShare(struggling, [false, false, false, false])).toBe(0.2);
  });
});

describe('demotion', () => {
  it('un-masters the previous rung after 8 frontier answers with ≤3 correct', () => {
    let m = masterUpTo(createMatrix(), 'analog', 'heel_uur');
    const results = [true, false, false, true, false, false, true, false];
    const { matrix, events } = answerN(m, 'analog', 'half_uur', 'frontier', results);
    expect(events).toContainEqual({ type: 'demoted', rep: 'analog', conceptId: 'half_uur', to: 'heel_uur' });
    expect(matrix.analog.heel_uur.mastered).toBe(false);
    expect(frontierFor(matrix, 'analog')).toBe('heel_uur');
    expect(matrix.analog.half_uur.window).toEqual([]);
  });

  it('at the bottom rung resets the window without an event', () => {
    const results = [true, false, false, true, false, false, true, false];
    const { matrix, events } = answerN(createMatrix(), 'analog', 'heel_uur', 'frontier', results);
    expect(events).toEqual([]);
    expect(matrix.analog.heel_uur.window).toEqual([]);
    expect(frontierFor(matrix, 'analog')).toBe('heel_uur');
  });
});

describe('review slippage', () => {
  it('un-masters a concept after 3 wrong in the last 4 review answers', () => {
    let m = masterUpTo(createMatrix(), 'analog', 'half_uur');
    const { matrix, events } = answerN(m, 'analog', 'heel_uur', 'review', [true, false, false, false]);
    expect(events).toContainEqual({ type: 'slipped', rep: 'analog', conceptId: 'heel_uur' });
    expect(matrix.analog.heel_uur.mastered).toBe(false);
    expect(frontierFor(matrix, 'analog')).toBe('heel_uur');
  });

  it('a single review miss does not un-master', () => {
    let m = masterUpTo(createMatrix(), 'analog', 'heel_uur');
    const { matrix, events } = answerN(m, 'analog', 'heel_uur', 'review', [true, true, true, false]);
    expect(events).toEqual([]);
    expect(matrix.analog.heel_uur.mastered).toBe(true);
  });
});

describe('pickRound', () => {
  it('holds core invariants over many random rounds', () => {
    const selections = [
      ['analog', 'digital'],
      ['analog', 'zin'],
      ['digital', 'zin'],
      ['analog', 'digital', 'zin'],
    ];
    const matrices = [
      createMatrix(),
      masterUpTo(createMatrix(), 'analog', 'kwartier'),
      masterUpTo(masterUpTo(createMatrix(), 'digital', 'kwartier'), 'zin', 'half_uur'),
      masterUpTo(masterUpTo(masterUpTo(createMatrix(), 'digital', 'vrij'), 'analog', 'vrij'), 'zin', 'vrij'),
    ];
    for (const selected of selections) {
      for (const matrix of matrices) {
        for (let i = 0; i < 100; i++) {
          const r = pickRound(matrix, selected);
          expect(selected).toContain(r.editTarget);
          expect(selected).toContain(r.refTarget);
          expect(r.editTarget).not.toBe(r.refTarget);
          expect(['frontier', 'review']).toContain(r.role);
          expect(minutesMatch(r.minuteConceptId, r.time.minutes)).toBe(true);
          expect(getConcept(r.conceptId)).toBeDefined();

          if (r.conceptId === 'uur_24') {
            expect(r.refTarget).toBe('digital');
            expect(r.attributionRep).toBe('digital');
            expect(r.role).toBe('frontier');
            expect(r.time.hours).toBeGreaterThanOrEqual(13);
            expect(r.time.hours).toBeLessThanOrEqual(23);
            expect(masteredMinuteConcepts(matrix, 'digital')).toContain(r.minuteConceptId);
          } else {
            expect(r.attributionRep).toBe(r.editTarget);
            expect(r.minuteConceptId).toBe(r.conceptId);
            if (r.role === 'frontier') {
              expect(r.conceptId).toBe(frontierFor(matrix, r.editTarget));
            } else {
              expect(matrix[r.editTarget][r.conceptId].mastered).toBe(true);
            }
            const maxHour = r.refTarget === 'digital' && matrix.digital.uur_24.mastered ? 23 : 12;
            expect(r.time.hours).toBeGreaterThanOrEqual(1);
            expect(r.time.hours).toBeLessThanOrEqual(maxHour);
          }
        }
      }
    }
  });

  it('fresh matrix always yields frontier heel_uur rounds', () => {
    const m = createMatrix();
    for (let i = 0; i < 50; i++) {
      const r = pickRound(m, ['analog', 'digital', 'zin']);
      expect(r.role).toBe('frontier');
      expect(r.conceptId).toBe('heel_uur');
      expect(r.time.minutes).toBe(0);
    }
  });

  it('fully mastered ladder yields only review rounds', () => {
    const m = masterUpTo(masterUpTo(masterUpTo(createMatrix(), 'digital', 'vrij'), 'analog', 'vrij'), 'zin', 'vrij');
    for (let i = 0; i < 50; i++) {
      const r = pickRound(m, ['analog', 'digital', 'zin']);
      expect(r.role).toBe('review');
    }
  });

  it('steers the frontier/review mix from the session results', () => {
    const m = masterUpTo(masterUpTo(createMatrix(), 'analog', 'heel_uur'), 'digital', 'heel_uur');
    const frontierFraction = (sessionResults) => {
      let frontier = 0;
      for (let i = 0; i < 1000; i++) {
        const r = pickRound(m, ['analog', 'digital'], Math.random, sessionResults);
        if (r.role === 'frontier') frontier++;
      }
      return frontier / 1000;
    };
    // Perfect recent play → ~85% frontier; a rough patch → ~20% frontier.
    expect(frontierFraction([true, true, true, true, true, true])).toBeGreaterThan(0.75);
    expect(frontierFraction([false, false, true, false, true, false])).toBeLessThan(0.3);
  });

  it('serves uur_24 rounds with digital as reference when it is the digital frontier', () => {
    const m = masterUpTo(createMatrix(), 'digital', 'kwartier');
    expect(frontierFor(m, 'digital')).toBe('uur_24');
    let seen = false;
    for (let i = 0; i < 300 && !seen; i++) {
      const r = pickRound(m, ['analog', 'digital']);
      if (r.conceptId === 'uur_24') {
        seen = true;
        expect(r.editTarget).toBe('analog');
        expect(r.refTarget).toBe('digital');
      }
    }
    expect(seen).toBe(true);
  });
});
