import { createGameStore } from './store.js';
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

function renderStart() {
  const el = createElement('section', { class: 'screen screen--center' });
  el.appendChild(createElement('h1', { class: 'game-title' }, 'Klok Oefenen'));
  el.appendChild(btn('Start', 'btn btn--primary btn--lg', () => store.goToModeSelect()));
  return el;
}

function renderModeSelect() {
  const el = createElement('section', { class: 'screen screen--center' });
  el.appendChild(createElement('h2', { class: 'screen-heading' }, 'Wat wil je oefenen?'));
  const group = createElement('div', { class: 'btn-group' });
  for (const [label, value] of [['Analoog', 'analoog'], ['Digitaal', 'digitaal'], ['Zin', 'zin'], ['Beide', 'beide']]) {
    group.appendChild(btn(label, 'btn btn--choice', () => store.selectMode(value)));
  }
  el.appendChild(group);
  el.appendChild(btn('← Terug', 'btn btn--ghost', () => store.goToStart()));
  return el;
}

function renderMinutesSelect() {
  const el = createElement('section', { class: 'screen screen--center' });
  el.appendChild(createElement('p', { class: 'select-step' }, 'Stap 1 van 2 — Minuten'));
  el.appendChild(createElement('h2', { class: 'screen-heading' }, 'Kies een niveau'));
  const grid = createElement('div', { class: 'difficulty-grid' });
  for (const level of MINUTE_LEVELS) {
    const card = createElement('button', { class: 'btn btn--difficulty', type: 'button', onClick: () => store.selectMinutesLevel(level.id) });
    card.appendChild(createElement('span', { class: 'difficulty-label' }, level.label));
    card.appendChild(createElement('span', { class: 'difficulty-sub' }, level.sublabel));
    grid.appendChild(card);
  }
  el.appendChild(grid);
  el.appendChild(btn('← Terug', 'btn btn--ghost', () => store.goToModeSelect()));
  return el;
}

function renderHourModeSelect() {
  const el = createElement('section', { class: 'screen screen--center' });
  el.appendChild(createElement('p', { class: 'select-step' }, 'Stap 2 van 2 — Uren'));
  el.appendChild(createElement('h2', { class: 'screen-heading' }, 'Kies een urennotatie'));
  const group = createElement('div', { class: 'hour-mode-group' });
  for (const mode of HOUR_MODES) {
    const card = createElement('button', { class: 'btn btn--hour-mode', type: 'button', onClick: () => store.selectHourMode(mode.id) });
    card.appendChild(createElement('span', { class: 'hour-mode-label' }, mode.label));
    card.appendChild(createElement('span', { class: 'hour-mode-sub' }, mode.sublabel));
    group.appendChild(card);
  }
  el.appendChild(group);
  el.appendChild(btn('← Terug', 'btn btn--ghost', () => store.goToMinutesSelect()));
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

  const { editTarget, refTarget, referenceTime, editTime, checked, correct, minutesLevel, hourMode } = state;
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
    const label = isEdit ? editLabel : readLabel;
    const cell = createElement('div', { class: 'clock-cell' + (isEdit ? ' clock-cell--edit' : '') });
    cell.appendChild(createElement('div', { class: 'clock-label' + (isEdit ? ' clock-label--edit' : '') }, label));
    cell.appendChild(comp.el);
    return cell;
  };

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
  el.appendChild(grid);
  el.appendChild(footer);
  return el;
}

let lastKey = null;

store.subscribe(state => {
  const key = `${state.screen}|${state.roundIndex}|${state.checked}`;
  if (key === lastKey) return;
  lastKey = key;
  app.innerHTML = '';
  if      (state.screen === 'start')            app.appendChild(renderStart());
  else if (state.screen === 'mode-select')      app.appendChild(renderModeSelect());
  else if (state.screen === 'minutes-select')   app.appendChild(renderMinutesSelect());
  else if (state.screen === 'hour-mode-select') app.appendChild(renderHourModeSelect());
  else if (state.screen === 'game')             app.appendChild(renderGame(state));
});

const init = store.get();
lastKey = `${init.screen}|${init.roundIndex}|${init.checked}`;
app.appendChild(renderStart());
