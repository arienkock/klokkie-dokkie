// Domain-agnostic UI shell: screen scaffolding, focus management, render-key
// diffing, hold-to-check + tap shields. All copy comes from `domain.strings`;
// the prompt/answer cells are filled by `domain.renderReference` /
// `domain.renderAnswer`. Imports nothing from `domains/` or concepts.

import './styles.css';
import { createGame, SESSION_NOMINAL } from '../game/index.js';
import { createElement } from '../util/dom.js';
import { holdButton, tapShield } from '../util/hold-button.js';

export function createPracticeApp({ domain, engine, mount, storage }) {
  const store = createGame({ engine, domain, storage });
  const strings = domain.strings;

  // Domain views from the previous render, destroyed before the next one.
  let prevViews = [];

  const btn = (label, cls, onClick, attrs = {}) =>
    createElement('button', { class: cls, type: 'button', onClick, ...attrs }, label);

  function renderNav(opts = {}) {
    const nav = createElement('nav', { class: 'app-nav' });
    nav.appendChild(createElement('span', { class: 'app-nav__title' }, strings.navTitle));
    if (opts.back) nav.appendChild(btn(opts.back.label, 'btn btn--ghost', opts.back.onClick));
    return nav;
  }

  function ladderRow(matrix, track, withLabel = true) {
    const ladder = track.ladder;
    const frontier = engine.frontierFor(matrix, track.id);
    const done = ladder.filter(id => matrix[track.id][id].mastered).length;

    const row = createElement('div', { class: 'ladder-row' });
    if (withLabel) row.appendChild(createElement('span', { class: 'ladder-rep' }, track.label));
    const dots = createElement('div', {
      class: 'ladder-dots',
      role: 'img',
      'aria-label': strings.ladderAria(track.label, done, ladder.length),
    });
    for (const id of ladder) {
      const cls = matrix[track.id][id].mastered
        ? 'ladder-dot ladder-dot--done'
        : id === frontier ? 'ladder-dot ladder-dot--current' : 'ladder-dot';
      dots.appendChild(createElement('span', { class: cls, title: domain.rung(id).label }));
    }
    row.appendChild(dots);
    return row;
  }

  function renderSetup(state) {
    const { selectedTracks, matrix } = state;
    const el = createElement('section', { class: 'screen screen--center' });
    el.appendChild(renderNav());
    el.appendChild(createElement('h2', { class: 'screen-heading' }, strings.setupHeading));
    el.appendChild(createElement('p', { class: 'setup-sub' }, strings.setupSub));

    const grid = createElement('div', { class: 'rep-grid' });
    domain.tracks.forEach((track, i) => {
      const selected = selectedTracks.includes(track.id);
      const card = createElement('button', {
        class: 'rep-card' + (selected ? ' rep-card--selected' : ''),
        type: 'button',
        'aria-pressed': String(selected),
        onClick: () => {
          store.toggleTrack(track.id);
          // the toggle re-renders the screen synchronously; put focus back
          mount.querySelectorAll('.rep-card')[i]?.focus();
        },
      });
      card.appendChild(createElement('span', { class: 'rep-card__check', 'aria-hidden': 'true' }, selected ? '✓' : ''));
      card.appendChild(createElement('span', { class: 'choice-label' }, track.label));
      card.appendChild(createElement('span', { class: 'rep-card__sub' }, track.sublabel));
      card.appendChild(ladderRow(matrix, track, false));
      grid.appendChild(card);
    });
    el.appendChild(grid);

    const canStart = selectedTracks.length >= domain.setup.minTracks;
    const start = btn(strings.startButton, 'btn btn--primary btn--lg', () => store.startSession(),
      canStart ? {} : { disabled: 'disabled' });
    el.appendChild(start);
    if (!canStart) {
      el.appendChild(createElement('p', { class: 'setup-hint' }, strings.setupHint));
    }
    return el;
  }

  function renderGame(state) {
    prevViews.forEach(v => v.destroy?.());
    prevViews = [];

    const { round, answerState, checked, correct, sessionHistory } = state;

    const refView = domain.renderReference(round);
    const ansView = domain.renderAnswer(round, answerState, {
      editable: !checked,
      onValue: v => store.setAnswer(v),
      onSubmit: c => store.check(c),
    });
    prevViews.push(refView, ansView);

    const makeCell = (view, isEdit) => {
      const cell = createElement('div', { class: 'problem-cell' + (isEdit ? ' problem-cell--edit' : '') });
      cell.appendChild(createElement('div', { class: 'problem-label' + (isEdit ? ' problem-label--edit' : '') }, view.label));
      cell.appendChild(view.el);
      return cell;
    };

    const correctCount = sessionHistory.filter(Boolean).length;
    const total = sessionHistory.length;
    const questionNr = total + (checked ? 0 : 1);
    const nrText = questionNr <= SESSION_NOMINAL ? strings.scoreOf(questionNr, SESSION_NOMINAL) : strings.scoreOverflow(questionNr);
    const scoreText = total === 0 ? nrText : `${nrText} · ${strings.scoreSuffix(correctCount, total)}`;

    const header = createElement('div', { class: 'game-header' });
    header.appendChild(createElement('span', { class: 'game-score' }, scoreText));
    header.appendChild(btn(strings.stopButton, 'btn btn--ghost', () => store.goToSetup()));

    const grid = createElement('div', { class: 'problem-grid' });
    grid.appendChild(makeCell(ansView, true));
    grid.appendChild(makeCell(refView, false));

    const footer = createElement('div', { class: 'game-footer' });
    if (!checked) {
      if (domain.submitMode(round) === 'manual') {
        // Grading is irreversible, so a stray tap must not grade: the button
        // only fires after a short hold.
        const check = holdButton(strings.checkButton, () => store.check());
        footer.appendChild(check.hint);
        footer.appendChild(check.el);
      }
    } else {
      footer.appendChild(createElement('div', { class: 'feedback feedback--' + (correct ? 'correct' : 'wrong'), role: 'status' },
        correct ? strings.feedbackCorrect : strings.feedbackWrong));
      footer.appendChild(btn(strings.nextButton, 'btn btn--primary', tapShield(() => store.nextRound())));
    }

    const el = createElement('section', { class: 'screen screen--game' });
    el.appendChild(header);
    el.appendChild(grid);
    el.appendChild(footer);
    return el;
  }

  function renderCelebration(state) {
    const { celebration } = state;
    const rung = domain.rung(celebration.conceptId);
    const track = domain.tracks.find(t => t.id === celebration.rep);
    const el = createElement('section', { class: 'screen screen--center screen--complete' });
    el.appendChild(createElement('div', { class: 'complete-icon' }, strings.celebrationIcon));
    el.appendChild(createElement('h2', { class: 'screen-heading' }, strings.celebrationHeading));
    el.appendChild(createElement('p', { class: 'complete-message' },
      strings.celebrationMessage(rung.label, track.inWords)));
    el.appendChild(btn(strings.celebrationButton, 'btn btn--primary btn--lg', tapShield(() => store.continueSession())));
    return el;
  }

  function renderSessionEnd(state) {
    const { sessionHistory, matrix, selectedTracks } = state;
    const correctCount = sessionHistory.filter(Boolean).length;
    const total = sessionHistory.length;
    const pct = total === 0 ? 0 : Math.round(correctCount / total * 100);

    const el = createElement('section', { class: 'screen screen--center screen--complete' });
    el.appendChild(createElement('div', { class: 'complete-icon' }, strings.sessionEndIcon));
    el.appendChild(createElement('h2', { class: 'screen-heading' }, strings.sessionEndHeading));
    el.appendChild(createElement('p', { class: 'complete-message' },
      strings.sessionEndMessage(correctCount, total, pct)));

    const progress = createElement('div', { class: 'ladder-summary' });
    progress.appendChild(createElement('p', { class: 'complete-sub' }, strings.progressLabel));
    for (const id of selectedTracks) {
      const track = domain.tracks.find(t => t.id === id);
      progress.appendChild(ladderRow(matrix, track));
    }
    el.appendChild(progress);

    const actions = createElement('div', { class: 'btn-group' });
    actions.appendChild(btn(strings.restartButton, 'btn btn--primary btn--lg', tapShield(() => store.startSession())));
    actions.appendChild(btn(strings.changeTracksButton, 'btn btn--ghost', tapShield(() => store.goToSetup())));
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
    mount.innerHTML = '';
    if      (state.screen === 'setup')       mount.appendChild(renderSetup(state));
    else if (state.screen === 'game')        mount.appendChild(renderGame(state));
    else if (state.screen === 'celebration') mount.appendChild(renderCelebration(state));
    else if (state.screen === 'session-end') mount.appendChild(renderSessionEnd(state));

    // Keep keyboard flow going: land focus on the primary action after an
    // answer is graded and on the celebration/end screens.
    if ((state.screen === 'game' && state.checked) || state.screen === 'celebration' || state.screen === 'session-end') {
      mount.querySelector('.btn--primary')?.focus();
    }
  });

  const init = store.get();
  lastKey = renderKey(init);
  mount.appendChild(renderSetup(init));

  return store;
}
