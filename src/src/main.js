import { createGameStore } from './store.js';
import { DIFFICULTIES, getDifficulty } from './difficulties.js';
import { DigitalClock } from './components/DigitalClock.js';
import { AnalogClock } from './components/AnalogClock.js';
import { createElement } from './utils/dom.js';

const store = createGameStore();
const app = document.getElementById('app');

let prevAnalog = null;

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
  for (const [label, value] of [['Analoog', 'analoog'], ['Digitaal', 'digitaal'], ['Beide', 'beide']]) {
    group.appendChild(btn(label, 'btn btn--choice', () => store.selectMode(value)));
  }
  el.appendChild(group);
  el.appendChild(btn('← Terug', 'btn btn--ghost', () => store.goToStart()));
  return el;
}

function renderDifficultySelect() {
  const el = createElement('section', { class: 'screen screen--center' });
  el.appendChild(createElement('h2', { class: 'screen-heading' }, 'Kies een niveau'));
  const grid = createElement('div', { class: 'difficulty-grid' });
  for (const diff of DIFFICULTIES) {
    const card = createElement('button', { class: 'btn btn--difficulty', type: 'button', onClick: () => store.selectDifficulty(diff.id) });
    card.appendChild(createElement('span', { class: 'difficulty-label' }, diff.label));
    card.appendChild(createElement('span', { class: 'difficulty-sub' }, diff.sublabel));
    grid.appendChild(card);
  }
  el.appendChild(grid);
  el.appendChild(btn('← Terug', 'btn btn--ghost', () => store.goToModeSelect()));
  return el;
}

function renderGame(state) {
  if (prevAnalog) { prevAnalog.destroy(); prevAnalog = null; }

  const { editTarget, referenceTime, editTime, checked, correct, difficulty } = state;
  const diff = getDifficulty(difficulty);
  const analogEditable  = editTarget === 'analog'  && !checked;
  const digitalEditable = editTarget === 'digital' && !checked;

  const analog  = new AnalogClock({ showNumbers: true, editable: analogEditable, minuteEditable: diff.minuteHandFree });
  const digital = new DigitalClock({ editable: digitalEditable });
  prevAnalog = analog;

  analog.update( editTarget === 'analog'  ? editTime : referenceTime);
  digital.update(editTarget === 'digital' ? editTime : referenceTime);

  if (analogEditable)  analog.onChange(t => store.setEditTime(t));
  if (digitalEditable) digital.onChange(t => store.setEditTime(t));

  const makeCell = (clock, label, isEdit) => {
    const cell = createElement('div', { class: 'clock-cell' + (isEdit ? ' clock-cell--edit' : '') });
    cell.appendChild(createElement('div', { class: 'clock-label' + (isEdit ? ' clock-label--edit' : '') }, label));
    cell.appendChild(clock.el);
    return cell;
  };

  const grid = createElement('div', { class: 'clock-grid' });
  grid.appendChild(makeCell(analog,  analogEditable  ? 'Stel de analoge klok in ✎'  : 'Analoge klok',  analogEditable));
  grid.appendChild(makeCell(digital, digitalEditable ? 'Stel de digitale klok in ✎' : 'Digitale klok', digitalEditable));

  const footer = createElement('div', { class: 'game-footer' });
  if (!checked) {
    footer.appendChild(btn('Controleer', 'btn btn--primary', () => store.check()));
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
  if      (state.screen === 'start')              app.appendChild(renderStart());
  else if (state.screen === 'mode-select')        app.appendChild(renderModeSelect());
  else if (state.screen === 'difficulty-select')  app.appendChild(renderDifficultySelect());
  else if (state.screen === 'game')               app.appendChild(renderGame(state));
});

const init = store.get();
lastKey = `${init.screen}|${init.roundIndex}|${init.checked}`;
app.appendChild(renderStart());
