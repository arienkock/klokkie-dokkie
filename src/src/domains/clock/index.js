// Clock domain object: the plugin the core game + shell consume. Bundles
// ladders, round generation, grading, Dutch copy, and widget wiring for the
// clock problem family.

import './styles.css';
import { LADDERS, REPRESENTATIONS, getConcept } from './concepts.js';
import { pickRound as clockPickRound, grade as clockGrade } from './round.js';
import { DigitalClock } from './widgets/DigitalClock.js';
import { AnalogClock } from './widgets/AnalogClock.js';
import { SentenceClock } from './widgets/SentenceClock.js';

export { engine } from './round.js';

const REP_LABELS = { analog: 'Analoog', digital: 'Digitaal', zin: 'Zin' };
const REP_SUBLABELS = {
  analog: 'Klok met wijzers',
  digital: 'Klok met cijfers',
  zin: 'Tijd in woorden',
};
const REP_IN_WORDS = {
  analog: 'de analoge klok',
  digital: 'de digitale klok',
  zin: 'tijdzinnen',
};

const COMPONENT_LABELS = {
  analog:  ['Analoge klok',  'Stel de analoge klok in ✎'],
  digital: ['Digitale klok', 'Stel de digitale klok in ✎'],
  zin:     ['Tijdszin',      'Vul de tijdszin in ✎'],
};

const makeComponent = (target, editable, minuteConcept) => {
  if (target === 'analog') {
    return new AnalogClock({
      showNumbers: true,
      editable,
      minuteEditable: minuteConcept.minuteHandFree,
      snapMinutes: minuteConcept.minuteSnap,
    });
  }
  if (target === 'digital') return new DigitalClock({ editable });
  return new SentenceClock({ editable });
};

export const clockDomain = {
  id: 'clock',
  storageKeys: { matrix: 'klokkie-mastery-v1', tracks: 'klokkie-reps-v1' },
  legacyStorageKeys: ['klok-oefenen-scores', 'klok-oefenen-adaptive'],
  tracks: REPRESENTATIONS.map(id => ({
    id,
    ladder: LADDERS[id],
    label: REP_LABELS[id],
    sublabel: REP_SUBLABELS[id],
    inWords: REP_IN_WORDS[id],
  })),
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

  strings: {
    navTitle: 'Klok Oefenen',
    setupHeading: 'Wat wil je oefenen?',
    setupSub: 'Kies minstens twee weergaven. Het spel past zich vanzelf aan jouw niveau aan.',
    startButton: 'Start oefenen',
    setupHint: 'Kies minstens twee weergaven om te starten.',
    stopButton: '← Stoppen',
    checkButton: 'Controleer',
    feedbackCorrect: 'Goed zo! ✓',
    feedbackWrong: 'Helaas, dat klopt niet.',
    nextButton: 'Volgende',
    celebrationIcon: '🎉',
    celebrationHeading: 'Nieuw niveau!',
    celebrationMessage: (rungLabel, trackInWords) => `Je beheerst nu “${rungLabel}” met ${trackInWords}!`,
    celebrationButton: 'Verder oefenen',
    sessionEndIcon: '⭐',
    sessionEndHeading: 'Goed gedaan!',
    sessionEndMessage: (correct, total, pct) => `Je had ${correct} van de ${total} vragen goed (${pct}%).`,
    progressLabel: 'Jouw voortgang:',
    restartButton: 'Nog een keer!',
    changeTracksButton: 'Andere weergaven kiezen',
    scoreOf: (nr, nominal) => `Vraag ${nr} van ${nominal}`,
    scoreOverflow: (nr) => `Vraag ${nr}`,
    scoreSuffix: (correct, total) => `${correct}/${total} goed`,
    ladderAria: (trackLabel, done, total) => `${trackLabel}: ${done} van ${total} niveaus behaald`,
  },

  submitMode: (round) => (round.editTarget === 'zin' ? 'auto' : 'manual'),

  renderReference(round) {
    const minuteConcept = getConcept(round.minuteConceptId);
    const comp = makeComponent(round.refTarget, false, minuteConcept);
    comp.update(round.referenceTime);
    const [readLabel] = COMPONENT_LABELS[round.refTarget];
    return { el: comp.el, label: readLabel, destroy: () => comp.destroy?.() };
  },

  renderAnswer(round, answerState, { editable, onValue, onSubmit }) {
    const minuteConcept = getConcept(round.minuteConceptId);
    const comp = makeComponent(round.editTarget, editable, minuteConcept);
    const displayTime = round.editTarget === 'zin' ? round.referenceTime : answerState;
    comp.update(displayTime);
    if (editable) {
      if (round.editTarget === 'zin') {
        // On a wrong attempt, let the red shake on the misplaced words paint
        // before the re-render replaces them; check() guards double calls.
        comp.onChange(({ correct }) =>
          correct ? onSubmit(true) : setTimeout(() => onSubmit(false), 700));
      } else {
        comp.onChange(t => onValue(t));
      }
    }
    const [, editLabel] = COMPONENT_LABELS[round.editTarget];
    return { el: comp.el, label: editLabel, destroy: () => comp.destroy?.() };
  },
};
