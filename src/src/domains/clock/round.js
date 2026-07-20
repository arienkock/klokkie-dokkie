// Clock domain: round generation + grading, built on the generic adaptive
// engine (core/engine). Re-exports the engine-bound matrix functions under
// their existing names so callers change only import paths.
// See docs/adaptive-difficulty.md for the rules implemented by the engine.

import { createAdaptiveEngine } from '../../core/engine/index.js';
import {
  LADDERS, REPRESENTATIONS, getConcept,
  randomMinutesFor, randomHour12, randomHour24, randomHourAny,
} from './concepts.js';
import { timesEqualAnalog } from './util/time.js';
import { pick } from '../../core/util/random.js';

const engine = createAdaptiveEngine({
  tracks: REPRESENTATIONS.map(id => ({ id, ladder: LADDERS[id] })),
});

export const createMatrix = engine.createMatrix;
export const normalizeMatrix = engine.normalizeMatrix;
export const frontierFor = engine.frontierFor;
export const isStruggling = engine.isStruggling;
export const sessionShare = engine.sessionShare;
export const frontierShare = engine.frontierShare;
export const recordAnswer = engine.recordAnswer;

// Review pool: mastered rungs that generate their own minutes. uur_24 is
// excluded — once mastered it shows up as 13-23 hours on digital references
// instead of as a reviewable concept of its own.
export const masteredMinuteConcepts = (matrix, rep) =>
  engine.masteredRungs(matrix, rep).filter(id => id !== 'uur_24');

// Hours 13-23 may appear on a digital reference once uur_24 is mastered.
const hourFor = (refTarget, matrix, rng) =>
  refTarget === 'digital' && matrix.digital.uur_24.mastered
    ? randomHourAny(rng)
    : randomHour12(rng);

const reviewRound = (matrix, editTarget, refTarget, rng) => {
  const conceptId = pick(masteredMinuteConcepts(matrix, editTarget), rng);
  return {
    editTarget, refTarget,
    attributionRep: editTarget,
    conceptId,
    minuteConceptId: conceptId,
    role: 'review',
    time: { hours: hourFor(refTarget, matrix, rng), minutes: randomMinutesFor(conceptId, rng) },
  };
};

// Pick the next round: representations, concept, role and a concrete time.
// selectedReps must contain at least two representations. sessionResults is
// the current game's answer history, steering the frontier/review mix.
export const pickRound = (matrix, selectedReps, rng = Math.random, sessionResults = []) => {
  const editTarget = pick(selectedReps, rng);
  const refTarget = pick(selectedReps.filter(r => r !== editTarget), rng);

  // uur_24 exception: a reading skill, exercised with digital as the
  // reference and attributed to digital regardless of the edit target.
  if (editTarget === 'digital' && frontierFor(matrix, 'digital') === 'uur_24') {
    if (rng() < frontierShare(matrix.digital.uur_24, sessionResults)) {
      const newEdit = pick(selectedReps.filter(r => r !== 'digital'), rng);
      const minuteConceptId = pick(masteredMinuteConcepts(matrix, 'digital'), rng);
      return {
        editTarget: newEdit,
        refTarget: 'digital',
        attributionRep: 'digital',
        conceptId: 'uur_24',
        minuteConceptId,
        role: 'frontier',
        time: { hours: randomHour24(rng), minutes: randomMinutesFor(minuteConceptId, rng) },
      };
    }
    return reviewRound(matrix, editTarget, refTarget, rng);
  }

  // Delegate the frontier-vs-review decision to the engine; the domain
  // supplies its uur_24-filtered review pool.
  const { rungId, role } = engine.chooseRungAndRole(
    matrix, editTarget, rng, sessionResults, masteredMinuteConcepts(matrix, editTarget)
  );

  return {
    editTarget, refTarget,
    attributionRep: editTarget,
    conceptId: rungId,
    minuteConceptId: rungId,
    role,
    time: { hours: hourFor(refTarget, matrix, rng), minutes: randomMinutesFor(rungId, rng) },
  };
};

export const grade = (referenceTime, editTime) => timesEqualAnalog(referenceTime, editTime);
