// Clock domain object: the plugin the core game consumes. Bundles ladders,
// round generation, and grading for the clock problem family.
// Strings + renderReference/renderAnswer/submitMode added in Phase 5.

import { LADDERS, REPRESENTATIONS, getConcept } from './concepts.js';
import { pickRound as clockPickRound, grade as clockGrade } from './round.js';

export { engine } from './round.js';

export const clockDomain = {
  id: 'clock',
  storageKeys: { matrix: 'klokkie-mastery-v1', tracks: 'klokkie-reps-v1' },
  legacyStorageKeys: ['klok-oefenen-scores', 'klok-oefenen-adaptive'],
  tracks: REPRESENTATIONS.map(id => ({ id, ladder: LADDERS[id] })),
  setup: { minTracks: 2 },
  rung: (id) => ({ id, label: getConcept(id).label }),
  pickRound(engine, matrix, selectedTracks, rng, sessionResults) {
    const r = clockPickRound(matrix, selectedTracks, rng, sessionResults);
    return {
      attributionTrack: r.attributionRep,
      rungId: r.conceptId,
      role: r.role,
      editTarget: r.editTarget,
      refTarget: r.refTarget,
      minuteConceptId: r.minuteConceptId,
      referenceTime: r.time,
    };
  },
  initAnswer: (round) => ({ ...getConcept(round.minuteConceptId).initialEditTime }),
  grade: (round, answerState) => clockGrade(round.referenceTime, answerState),
};
