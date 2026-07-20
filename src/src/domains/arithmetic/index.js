// Arithmetic domain object: the plugin the (unchanged) core game + shell
// consume. Proves the core is genuinely problem-type-agnostic — free-form
// numeric input, manual submit, minTracks: 1, no clock anywhere.

import './styles.css';
import { createAdaptiveEngine } from '../../core/engine/index.js';
import { LADDER, RUNGS } from './rungs.js';

export const engine = createAdaptiveEngine({
  tracks: [
    { id: 'equation', ladder: LADDER },
    { id: 'story', ladder: LADDER },
  ],
});

// Turn a bare equation like "7 + 5" into a short Dutch word problem ending in a
// question. Both tracks exercise the SAME ladder; only the framing differs.
const storyTemplate = (text, answer) => {
  const m = text.match(/^(\d+)\s*([+\-×])\s*(\d+)$/);
  if (!m) return `${text} = ?`;
  const [, a, op, b] = m;
  if (op === '+') return `Je hebt ${a} appels en krijgt er ${b} bij. Hoeveel appels heb je nu?`;
  if (op === '-') return `Je hebt ${a} snoepjes en geeft er ${b} weg. Hoeveel snoepjes heb je nog?`;
  return `Er zijn ${a} dozen met elk ${b} knikkers. Hoeveel knikkers zijn er samen?`;
};

export const arithmeticDomain = {
  id: 'arithmetic',
  storageKeys: { matrix: 'rekenen-mastery-v1', tracks: 'rekenen-tracks-v1' },
  legacyStorageKeys: [],

  tracks: [
    { id: 'equation', ladder: LADDER, label: 'Sommen', sublabel: '7 + 5', inWords: 'sommen' },
    { id: 'story', ladder: LADDER, label: 'Verhaaltjes', sublabel: 'Verhaalsommen', inWords: 'verhaalsommen' },
  ],
  setup: { minTracks: 1 },
  rung: (id) => ({ id, label: RUNGS[id].label }),

  pickRound(engine, matrix, selectedTracks, rng, sessionResults) {
    const track = selectedTracks[Math.floor(rng() * selectedTracks.length)];
    const reviewPool = engine.masteredRungs(matrix, track);
    const { rungId, role } = engine.chooseRungAndRole(matrix, track, rng, sessionResults, reviewPool);
    const { text, answer } = RUNGS[rungId].generate(rng);
    return {
      attributionTrack: track,
      rungId,
      role,
      framing: track,
      promptText: track === 'story' ? storyTemplate(text, answer) : `${text} =`,
      answer,
    };
  },

  initAnswer: () => '',
  grade: (round, answerState) => answerState.trim() !== '' && Number(answerState) === round.answer,
  submitMode: () => 'manual',

  strings: {
    navTitle: 'Rekenen',
    setupHeading: 'Wat wil je oefenen?',
    setupSub: 'Kies wat je wilt oefenen.',
    startButton: 'Start oefenen',
    setupHint: 'Kies minstens één onderdeel.',
    stopButton: '← Stoppen',
    checkButton: 'Controleer',
    feedbackCorrect: 'Goed zo! ✓',
    feedbackWrong: 'Helaas, dat klopt niet.',
    nextButton: 'Volgende',
    celebrationIcon: '🎉',
    celebrationHeading: 'Nieuw niveau!',
    celebrationMessage: (rungLabel, trackInWords) => `Je beheerst nu “${rungLabel}” bij ${trackInWords}!`,
    celebrationButton: 'Verder oefenen',
    sessionEndIcon: '⭐',
    sessionEndHeading: 'Goed gedaan!',
    sessionEndMessage: (correct, total, pct) => `Je had ${correct} van de ${total} sommen goed (${pct}%).`,
    progressLabel: 'Jouw voortgang:',
    restartButton: 'Nog een keer!',
    changeTracksButton: 'Iets anders kiezen',
    scoreOf: (nr, nominal) => `Som ${nr} van ${nominal}`,
    scoreOverflow: (nr) => `Som ${nr}`,
    scoreSuffix: (correct, total) => `${correct}/${total} goed`,
    ladderAria: (label, done, total) => `${label}: ${done} van ${total} niveaus behaald`,
  },

  renderReference(round) {
    const el = document.createElement('div');
    el.className = 'arith-prompt';
    el.textContent = round.promptText;
    return { el, label: round.framing === 'story' ? 'Verhaal' : 'Som' };
  },

  renderAnswer(round, answerState, { editable, onValue, onSubmit }) {
    const el = document.createElement('div');
    el.className = 'arith-answer';
    const input = document.createElement('input');
    input.className = 'arith-input';
    input.setAttribute('inputmode', 'numeric');
    input.type = 'text';
    input.value = answerState;
    if (editable) {
      input.addEventListener('input', (e) => onValue(e.target.value));
    } else {
      input.disabled = true;
    }
    el.appendChild(input);
    return { el, label: 'Antwoord' };
  },
};
