import { createGameStore, gameKey, getOptionStatus } from './store.js';
import { MINUTE_LEVELS, HOUR_MODES, getDifficulty } from './difficulties.js';
import { DigitalClock } from './components/DigitalClock.js';
import { AnalogClock } from './components/AnalogClock.js';
import { SentenceClock } from './components/SentenceClock.js';
import { createElement } from './utils/dom.js';

const store = createGameStore();
const app = document.getElementById('app');

let prevToDestroy = [];

const btn = (label, cls, onClick) =>
  createElement('button', { class: cls, type: 'button', onClick }, label);

function renderNav(opts = {}) {
  const nav = createElement('nav', { class: 'app-nav' });
  nav.appendChild(createElement('span', { class: 'app-nav__title' }, 'Klok Oefenen'));
  if (opts.back) nav.appendChild(btn(opts.back.label, 'btn btn--ghost', opts.back.onClick));
  return nav;
}

function scoreCardBtn(label, status, extraCls, onClick) {
  const cls = [
    'btn', extraCls,
    status?.completed ? 'btn--completed' : status ? 'btn--progress' : '',
  ].filter(Boolean).join(' ');
  const el = createElement('button', { class: cls, type: 'button', onClick });
  el.appendChild(createElement('span', { class: 'choice-label' }, label));
  if (status) {
    el.appendChild(createElement('span', { class: 'score-badge' }, `${status.percentage}%`));
  }
  return el;
}

function renderModeSelect() {
  const { scores } = store.get();
  const el = createElement('section', { class: 'screen screen--center' });
  el.appendChild(renderNav());
  el.appendChild(createElement('h2', { class: 'screen-heading' }, 'Wat wil je oefenen?'));
  const group = createElement('div', { class: 'btn-group' });
  for (const [label, value] of [['Analoog', 'analoog'], ['Digitaal', 'digitaal'], ['Zin', 'zin'], ['Alles', 'alles']]) {
    const status = getOptionStatus(scores, value);
    group.appendChild(scoreCardBtn(label, status, 'btn--choice', () => store.selectMode(value)));
  }
  el.appendChild(group);
  return el;
}

function renderMinutesSelect() {
  const { scores, mode } = store.get();
  const el = createElement('section', { class: 'screen screen--center' });
  el.appendChild(renderNav({ back: { label: '← Terug', onClick: () => store.goToModeSelect() } }));
  el.appendChild(createElement('p', { class: 'select-step' }, 'Stap 1 van 2 — Minuten'));
  el.appendChild(createElement('h2', { class: 'screen-heading' }, 'Kies een niveau'));
  const grid = createElement('div', { class: 'difficulty-grid' });
  for (const level of MINUTE_LEVELS) {
    const status = getOptionStatus(scores, mode, level.id);
    const card = scoreCardBtn(level.label, status, 'btn--difficulty', () => store.selectMinutesLevel(level.id));
    card.appendChild(createElement('span', { class: 'difficulty-sub' }, level.sublabel));
    grid.appendChild(card);
  }
  el.appendChild(grid);
  return el;
}

function renderHourModeSelect() {
  const { scores, mode, minutesLevel } = store.get();
  const el = createElement('section', { class: 'screen screen--center' });
  el.appendChild(renderNav({ back: { label: '← Terug', onClick: () => store.goToMinutesSelect() } }));
  el.appendChild(createElement('p', { class: 'select-step' }, 'Stap 2 van 2 — Uren'));
  el.appendChild(createElement('h2', { class: 'screen-heading' }, 'Kies een urennotatie'));
  const group = createElement('div', { class: 'hour-mode-group' });
  for (const hm of HOUR_MODES) {
    const status = getOptionStatus(scores, mode, minutesLevel, hm.id);
    const card = scoreCardBtn(hm.label, status, 'btn--hour-mode', () => store.selectHourMode(hm.id));
    card.appendChild(createElement('span', { class: 'hour-mode-sub' }, hm.sublabel));
    group.appendChild(card);
  }
  el.appendChild(group);
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

  const { editTarget, refTarget, referenceTime, editTime, checked, correct, minutesLevel, hourMode, sessionHistory } = state;
  const diff = getDifficulty(minutesLevel, hourMode);
  const isEditable = !checked;

  const makeComponent = (target, editable) => {
    if (target === 'analog') {
      const c = new AnalogClock({ showNumbers: true, editable, minuteEditable: diff.minuteHandFree, snapMinutes: diff.minuteSnap });
      prevToDestroy.push(c);
      return c;
    }
    if (target === 'digital') return new DigitalClock({ editable });
    return new SentenceClock({ editable });
  };

  const editComp = makeComponent(editTarget, isEditable);
  const refComp  = makeComponent(refTarget,  false);

  const editDisplayTime = editTarget === 'zin' ? referenceTime : editTime;
  editComp.update(editDisplayTime);
  refComp.update(referenceTime);

  if (isEditable) {
    if (editTarget === 'zin') {
      editComp.onChange(t => { store.setEditTime(t); store.check(); });
    } else {
      editComp.onChange(t => store.setEditTime(t));
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
  const scoreText = total === 0 ? 'Nog geen vragen' : `${correctCount}/${total} goed`;

  const header = createElement('div', { class: 'game-header' });
  header.appendChild(createElement('span', { class: 'game-score' }, scoreText));
  header.appendChild(btn('← Terug', 'btn btn--ghost', () => store.goToModeSelect()));

  const grid = createElement('div', { class: 'clock-grid' });
  grid.appendChild(makeCell(editComp, editTarget, true));
  grid.appendChild(makeCell(refComp,  refTarget,  false));

  const footer = createElement('div', { class: 'game-footer' });
  if (!checked) {
    if (editTarget !== 'zin') {
      footer.appendChild(btn('Controleer', 'btn btn--primary', () => store.check()));
    }
  } else {
    footer.appendChild(createElement('div', { class: 'feedback feedback--' + (correct ? 'correct' : 'wrong') },
      correct ? 'Goed zo! ✓' : 'Helaas, dat klopt niet.'));
    footer.appendChild(btn('Volgende', 'btn btn--primary', () => store.nextRound()));
  }

  const el = createElement('section', { class: 'screen screen--game' });
  el.appendChild(header);
  el.appendChild(grid);
  el.appendChild(footer);
  return el;
}

function renderGameComplete(state) {
  const { scores, currentGameKey, mode } = state;
  const entry = scores[currentGameKey] || { percentage: 0 };
  const modeLabels = { analoog: 'Analoog', digitaal: 'Digitaal', zin: 'Zin', alles: 'Alles' };

  const el = createElement('section', { class: 'screen screen--center screen--complete' });
  el.appendChild(createElement('div', { class: 'complete-icon' }, '🎉'));
  el.appendChild(createElement('h2', { class: 'screen-heading' }, 'Gefeliciteerd!'));
  el.appendChild(createElement('p', { class: 'complete-message' },
    `Je hebt ${modeLabels[mode] || mode} geoefend met ${entry.percentage}% goed.`));
  el.appendChild(createElement('p', { class: 'complete-sub' }, 'Je beheerst dit onderdeel uitstekend!'));
  el.appendChild(btn('Ander oefening kiezen', 'btn btn--primary btn--lg', () => store.goToModeSelect()));
  return el;
}

let lastKey = null;

store.subscribe(state => {
  const key = `${state.screen}|${state.roundIndex}|${state.checked}`;
  if (key === lastKey) return;
  lastKey = key;
  app.innerHTML = '';
  if      (state.screen === 'mode-select')      app.appendChild(renderModeSelect());
  else if (state.screen === 'minutes-select')   app.appendChild(renderMinutesSelect());
  else if (state.screen === 'hour-mode-select') app.appendChild(renderHourModeSelect());
  else if (state.screen === 'game')             app.appendChild(renderGame(state));
  else if (state.screen === 'game-complete')    app.appendChild(renderGameComplete(state));
});

const init = store.get();
lastKey = `${init.screen}|${init.roundIndex}|${init.checked}`;
app.appendChild(renderModeSelect());
