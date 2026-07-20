import { createGameStore, SESSION_NOMINAL } from './store.js';
import { getConcept, LADDERS, REPRESENTATIONS } from './domains/clock/concepts.js';
import { frontierFor } from './domains/clock/round.js';
import { DigitalClock } from './domains/clock/widgets/DigitalClock.js';
import { AnalogClock } from './domains/clock/widgets/AnalogClock.js';
import { SentenceClock } from './domains/clock/widgets/SentenceClock.js';
import { createElement } from './core/util/dom.js';
import { holdButton, tapShield } from './core/util/hold-button.js';

const store = createGameStore();
const app = document.getElementById('app');

let prevToDestroy = [];

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

const btn = (label, cls, onClick, attrs = {}) =>
  createElement('button', { class: cls, type: 'button', onClick, ...attrs }, label);

function renderNav(opts = {}) {
  const nav = createElement('nav', { class: 'app-nav' });
  nav.appendChild(createElement('span', { class: 'app-nav__title' }, 'Klok Oefenen'));
  if (opts.back) nav.appendChild(btn(opts.back.label, 'btn btn--ghost', opts.back.onClick));
  return nav;
}

function ladderRow(matrix, rep, withLabel = true) {
  const ladder = LADDERS[rep];
  const frontier = frontierFor(matrix, rep);
  const done = ladder.filter(id => matrix[rep][id].mastered).length;

  const row = createElement('div', { class: 'ladder-row' });
  if (withLabel) row.appendChild(createElement('span', { class: 'ladder-rep' }, REP_LABELS[rep]));
  const dots = createElement('div', {
    class: 'ladder-dots',
    role: 'img',
    'aria-label': `${REP_LABELS[rep]}: ${done} van ${ladder.length} niveaus behaald`,
  });
  for (const id of ladder) {
    const cls = matrix[rep][id].mastered
      ? 'ladder-dot ladder-dot--done'
      : id === frontier ? 'ladder-dot ladder-dot--current' : 'ladder-dot';
    dots.appendChild(createElement('span', { class: cls, title: getConcept(id).label }));
  }
  row.appendChild(dots);
  return row;
}

function renderSetup(state) {
  const { selectedTracks, matrix } = state;
  const el = createElement('section', { class: 'screen screen--center' });
  el.appendChild(renderNav());
  el.appendChild(createElement('h2', { class: 'screen-heading' }, 'Wat wil je oefenen?'));
  el.appendChild(createElement('p', { class: 'setup-sub' }, 'Kies minstens twee weergaven. Het spel past zich vanzelf aan jouw niveau aan.'));

  const grid = createElement('div', { class: 'rep-grid' });
  REPRESENTATIONS.forEach((rep, i) => {
    const selected = selectedTracks.includes(rep);
    const card = createElement('button', {
      class: 'rep-card' + (selected ? ' rep-card--selected' : ''),
      type: 'button',
      'aria-pressed': String(selected),
      onClick: () => {
        store.toggleTrack(rep);
        // the toggle re-renders the screen synchronously; put focus back
        app.querySelectorAll('.rep-card')[i]?.focus();
      },
    });
    card.appendChild(createElement('span', { class: 'rep-card__check', 'aria-hidden': 'true' }, selected ? '✓' : ''));
    card.appendChild(createElement('span', { class: 'choice-label' }, REP_LABELS[rep]));
    card.appendChild(createElement('span', { class: 'rep-card__sub' }, REP_SUBLABELS[rep]));
    card.appendChild(ladderRow(matrix, rep, false));
    grid.appendChild(card);
  });
  el.appendChild(grid);

  const canStart = selectedTracks.length >= 2;
  const start = btn('Start oefenen', 'btn btn--primary btn--lg', () => store.startSession(),
    canStart ? {} : { disabled: 'disabled' });
  el.appendChild(start);
  if (!canStart) {
    el.appendChild(createElement('p', { class: 'setup-hint' }, 'Kies minstens twee weergaven om te starten.'));
  }
  return el;
}

const COMPONENT_LABELS = {
  analog:  ['Analoge klok',  'Stel de analoge klok in ✎'],
  digital: ['Digitale klok', 'Stel de digitale klok in ✎'],
  zin:     ['Tijdszin',      'Vul de tijdszin in ✎'],
};

function renderGame(state) {
  prevToDestroy.forEach(c => c.destroy());
  prevToDestroy = [];

  const { round, answerState, checked, correct, sessionHistory } = state;
  const { editTarget, refTarget, referenceTime } = round;
  const minuteConcept = getConcept(round.minuteConceptId);
  const isEditable = !checked;

  const makeComponent = (target, editable) => {
    if (target === 'analog') {
      const c = new AnalogClock({
        showNumbers: true,
        editable,
        minuteEditable: minuteConcept.minuteHandFree,
        snapMinutes: minuteConcept.minuteSnap,
      });
      prevToDestroy.push(c);
      return c;
    }
    if (target === 'digital') return new DigitalClock({ editable });
    return new SentenceClock({ editable });
  };

  const editComp = makeComponent(editTarget, isEditable);
  const refComp  = makeComponent(refTarget,  false);

  const editDisplayTime = editTarget === 'zin' ? referenceTime : answerState;
  editComp.update(editDisplayTime);
  refComp.update(referenceTime);

  if (isEditable) {
    if (editTarget === 'zin') {
      // On a wrong attempt, let the red shake on the misplaced words paint
      // before the re-render replaces them; check() guards double calls.
      editComp.onChange(({ correct: zinCorrect }) =>
        zinCorrect ? store.check(true) : setTimeout(() => store.check(false), 700));
    } else {
      editComp.onChange(t => store.setAnswer(t));
    }
  }

  const makeCell = (comp, target, isEdit) => {
    const [readLabel, editLabel] = COMPONENT_LABELS[target];
    const cell = createElement('div', { class: 'clock-cell' + (isEdit ? ' clock-cell--edit' : '') });
    cell.appendChild(createElement('div', { class: 'clock-label' + (isEdit ? ' clock-label--edit' : '') }, isEdit ? editLabel : readLabel));
    cell.appendChild(comp.el);
    return cell;
  };

  const correctCount = sessionHistory.filter(Boolean).length;
  const total = sessionHistory.length;
  const questionNr = total + (checked ? 0 : 1);
  const nrText = questionNr <= SESSION_NOMINAL ? `Vraag ${questionNr} van ${SESSION_NOMINAL}` : `Vraag ${questionNr}`;
  const scoreText = total === 0 ? nrText : `${nrText} · ${correctCount}/${total} goed`;

  const header = createElement('div', { class: 'game-header' });
  header.appendChild(createElement('span', { class: 'game-score' }, scoreText));
  header.appendChild(btn('← Stoppen', 'btn btn--ghost', () => store.goToSetup()));

  const grid = createElement('div', { class: 'clock-grid' });
  grid.appendChild(makeCell(editComp, editTarget, true));
  grid.appendChild(makeCell(refComp,  refTarget,  false));

  const footer = createElement('div', { class: 'game-footer' });
  if (!checked) {
    if (editTarget !== 'zin') {
      // Grading is irreversible, so a stray tap must not grade: the button
      // only fires after a short hold.
      const check = holdButton('Controleer', () => store.check());
      footer.appendChild(check.hint);
      footer.appendChild(check.el);
    }
  } else {
    footer.appendChild(createElement('div', { class: 'feedback feedback--' + (correct ? 'correct' : 'wrong'), role: 'status' },
      correct ? 'Goed zo! ✓' : 'Helaas, dat klopt niet.'));
    footer.appendChild(btn('Volgende', 'btn btn--primary', tapShield(() => store.nextRound())));
  }

  const el = createElement('section', { class: 'screen screen--game' });
  el.appendChild(header);
  el.appendChild(grid);
  el.appendChild(footer);
  return el;
}

function renderCelebration(state) {
  const { celebration } = state;
  const concept = getConcept(celebration.conceptId);
  const el = createElement('section', { class: 'screen screen--center screen--complete' });
  el.appendChild(createElement('div', { class: 'complete-icon' }, '🎉'));
  el.appendChild(createElement('h2', { class: 'screen-heading' }, 'Nieuw niveau!'));
  el.appendChild(createElement('p', { class: 'complete-message' },
    `Je beheerst nu “${concept.label}” met ${REP_IN_WORDS[celebration.rep]}!`));
  el.appendChild(btn('Verder oefenen', 'btn btn--primary btn--lg', tapShield(() => store.continueSession())));
  return el;
}

function renderSessionEnd(state) {
  const { sessionHistory, matrix, selectedTracks } = state;
  const correctCount = sessionHistory.filter(Boolean).length;
  const total = sessionHistory.length;
  const pct = total === 0 ? 0 : Math.round(correctCount / total * 100);

  const el = createElement('section', { class: 'screen screen--center screen--complete' });
  el.appendChild(createElement('div', { class: 'complete-icon' }, '⭐'));
  el.appendChild(createElement('h2', { class: 'screen-heading' }, 'Goed gedaan!'));
  el.appendChild(createElement('p', { class: 'complete-message' },
    `Je had ${correctCount} van de ${total} vragen goed (${pct}%).`));

  const progress = createElement('div', { class: 'ladder-summary' });
  progress.appendChild(createElement('p', { class: 'complete-sub' }, 'Jouw voortgang:'));
  for (const rep of selectedTracks) {
    progress.appendChild(ladderRow(matrix, rep));
  }
  el.appendChild(progress);

  const actions = createElement('div', { class: 'btn-group' });
  actions.appendChild(btn('Nog een keer!', 'btn btn--primary btn--lg', tapShield(() => store.startSession())));
  actions.appendChild(btn('Andere weergaven kiezen', 'btn btn--ghost', tapShield(() => store.goToSetup())));
  el.appendChild(actions);
  return el;
}

let lastKey = null;

const renderKey = (state) =>
  `${state.screen}|${state.roundIndex}|${state.checked}|${state.selectedTracks.join(',')}`;

store.subscribe(state => {
  const key = renderKey(state);
  if (key === lastKey) return;
  lastKey = key;
  app.innerHTML = '';
  if      (state.screen === 'setup')       app.appendChild(renderSetup(state));
  else if (state.screen === 'game')        app.appendChild(renderGame(state));
  else if (state.screen === 'celebration') app.appendChild(renderCelebration(state));
  else if (state.screen === 'session-end') app.appendChild(renderSessionEnd(state));

  // Keep keyboard flow going: land focus on the primary action after an
  // answer is graded and on the celebration/end screens.
  if ((state.screen === 'game' && state.checked) || state.screen === 'celebration' || state.screen === 'session-end') {
    app.querySelector('.btn--primary')?.focus();
  }
});

const init = store.get();
lastKey = renderKey(init);
app.appendChild(renderSetup(init));
