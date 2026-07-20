# Core extraction plan

Extract a reusable, domain-agnostic **adaptive practice core** from the clock app.
The core keeps the adaptivity engine, session lifecycle, and UI shell. The clock
(analog / digital / Dutch sentence) becomes one **domain plugin** that plugs into
the core. The core must be reusable for other problem types — e.g. arithmetic
(bare equations or story problems) with free-form input or custom controls.

The library stays in this repo (no separate npm package yet): a plain directory
split enforced by import discipline. `core/` must never import from `domains/`.

Status: living document. Each phase below has acceptance criteria; `npm test`
must stay green after every phase.

---

## Terminology (renames from the clock-specific code)

| Clock term (today)      | Generic term (core)   | Meaning |
|-------------------------|-----------------------|---------|
| representation (`rep`)  | **track**             | A selectable dimension the ladder is duplicated across; mastery is tracked per `(track, rung)`. Clock: `analog` / `digital` / `zin`. |
| concept                 | **rung**              | One step of a ladder, with an id + label. |
| `LADDERS[rep]`          | **ladder**            | Ordered list of rung ids for a track. |
| `concepts.js` + widgets | **domain** (a.k.a. ProblemType) | The plugin bundling ladders, round generation, grading, widgets, and strings for one problem family. |
| `pickRound` result      | **round**             | `{ attributionTrack, rungId, role, payload }`. `payload` is domain-private data (clock: edit/ref target, time, minute concept). |
| `editTime` / edit state | **answerState**       | Domain-private working state for the learner's in-progress answer. |

`role` is `'frontier'` (the rung being learned) or `'review'` (a mastered rung
being maintained) — unchanged from today.

---

## Target structure (all under `src/src/`)

```
core/
  engine/index.js      # adaptive matrix — was mastery.js, now config-driven
  game/index.js        # session lifecycle store — was store.js core parts
  shell/index.js       # createPracticeApp + screens — was main.js scaffolding
  util/random.js       # generic
  util/dom.js          # generic
  util/hold-button.js  # generic
  index.js             # public API re-exports
domains/
  clock/
    concepts.js        # ladders + rung metadata (clock)
    round.js           # pickRound (incl. uur_24 case) + grade + initAnswer
    widgets/AnalogClock.js
    widgets/DigitalClock.js
    widgets/SentenceClock.js
    util/time.js
    util/zinnen.js
    strings.nl.js      # all Dutch copy
    styles.css         # clock-only CSS
    index.js           # the domain object
  arithmetic/          # phase 7 proof-of-concept (validates agnosticism)
core/shell/styles.css  # shell/generic CSS
main.js                # createPracticeApp({ domain: clock, mount: '#app' })
```

Dead code removed during extraction: `components/app-shell.js`,
`components/app-card.js`, `test/app-card.test.js`, and the unused
`@shoelace-style/shoelace` dependency (imported nowhere).

---

## The domain (ProblemType) contract

A domain is a plain object the core consumes:

```js
const domain = {
  id: 'clock',
  storageNamespace: 'klokkie',          // localStorage key prefix
  legacyStorageKeys: ['klok-oefenen-scores', 'klok-oefenen-adaptive'], // purged on load

  // --- ladder config (feeds the engine) ---
  tracks: [                              // order = display order in setup picker
    { id: 'analog',  label, sublabel, inWords, ladder: [rungId, …] },
    { id: 'digital', label, sublabel, inWords, ladder: [rungId, …] },
    { id: 'zin',     label, sublabel, inWords, ladder: [rungId, …] },
  ],
  rung: (id) => ({ id, label }),         // metadata for ladder dots + celebration
  setup: { minTracks: 2 },               // picker constraint (clock needs 2; math may need 1)

  // --- round lifecycle ---
  // Uses engine helpers (chooseRungAndRole / frontierFor / masteredRungs) then
  // attaches domain payload. Domain-specific special cases (e.g. uur_24
  // cross-attribution) live entirely here.
  pickRound(engine, matrix, selectedTracks, rng, sessionResults)
    -> { attributionTrack, rungId, role, payload },
  initAnswer(round) -> answerState,      // fresh answer state (was initialEditTime)
  grade(round, answerState) -> boolean,  // was timesEqualAnalog

  // --- UI ---
  // Both return { el, label, destroy? }. Shell places them in prompt + answer cells.
  renderReference(round) -> view,        // read-only prompt
  renderAnswer(round, answerState, { onValue, onSubmit }) -> view,
  //   onValue(value): learner changed the in-progress answer (shell stores it)
  //   onSubmit(explicitCorrect?): widget requests grading now (auto-submit path)
  submitMode(round) -> 'manual' | 'auto',// 'manual' = shell shows hold-to-check button
                                         // 'auto'   = widget submits itself (e.g. sentence)

  strings: { …i18n… },                   // titles, headings, feedback, celebration templates
};
```

### Grading contract

`store.check(explicitCorrect?)`: if `explicitCorrect` is a boolean use it,
otherwise `correct = domain.grade(round, answerState)`. Manual-submit widgets
leave it undefined (shell's Controleer button calls `check()`); auto-submit
widgets that already know correctness (the sentence builder) pass it via
`onSubmit(correct)`. This preserves today's `forcedCorrect` behaviour.

---

## Core engine API — `core/engine`

`createAdaptiveEngine(config)` where `config = { tracks: [{ id, ladder }, …] }`
(the domain's tracks; only `id` + `ladder` are used). Returns pure functions,
no DOM, no storage — fully unit-tested:

- `createMatrix()`
- `normalizeMatrix(raw)`
- `frontierFor(matrix, track)` → first unmastered rung id or `null`
- `masteredRungs(matrix, track)` → mastered rung ids (domain applies its own
  exclusions, e.g. clock drops `uur_24` from its review pool)
- `isStruggling(cell)`
- `sessionShare(sessionResults)`
- `frontierShare(cell, sessionResults)`
- `chooseRungAndRole(matrix, track, rng, sessionResults, reviewPool)` →
  `{ rungId, role }` — extracts today's frontier-vs-review decision so domains
  don't reimplement it. `reviewPool` is the domain-filtered mastered rungs.
- `recordAnswer(matrix, track, rungId, role, correct)` → `{ matrix, events }`

All ladder/track knowledge comes from `config`; the engine imports nothing from
`domains/` or `concepts.js`.

---

## Core game store — `core/game`

`createGame({ engine, domain, storage })` → store with the generic lifecycle
that lives in `store.js` today:

- screens: `setup` → `game` → (`celebration`) → … → `session-end`
- track selection + persistence (`${ns}-tracks-v1`), matrix persistence
  (`${ns}-mastery-v1`), legacy-key purge from `domain.legacyStorageKeys`
- session shape: `SESSION_NOMINAL` (20), `SESSION_CAP` (25), end-on-high-note
- revisit queue (unchanged parameters: `REVISIT_QUEUE_MAX`, `REVISIT_AFTER`)
- `check` / `nextRound` / `continueSession` / `startSession` / `goToSetup` / `toggleTrack`

State shape becomes domain-agnostic: instead of
`editTarget/refTarget/referenceTime/editTime` the store holds `round` (domain
payload) + `answerState`. Grading and problem generation delegate to `domain`.

---

## UI shell — `core/shell`

`createPracticeApp({ domain, mount })`. Owns the screen scaffolding from
`main.js`: nav, ladder dots, score line, setup picker, game two-pane layout,
celebration, session-end, focus management, render-key diffing, hold-to-check
button, tap shields. All copy comes from `domain.strings`; the prompt/answer
cells are filled by `domain.renderReference` / `domain.renderAnswer`; the
Controleer button appears only when `submitMode === 'manual'`.

---

## Migration phases (each ends green; commit a checkpoint per phase)

**Phase 1 — utils split + delete dead code.** Create `core/util/` (random,
dom, hold-button) and `domains/clock/util/` (time, zinnen). Move widgets to
`domains/clock/widgets/`. Delete app-shell, app-card, their test, and the
shoelace dep. Fix all imports + test paths. Pure moves, no behaviour change.

**Phase 2 — introduce the generic engine under a shim (zero caller churn).**
Create `core/engine/index.js` exporting `createAdaptiveEngine({ tracks })` with
the *generic matrix* functions only: `createMatrix`, `normalizeMatrix`,
`frontierFor`, `masteredRungs` (all mastered rungs, no exclusions),
`isStruggling`, `sessionShare`, `frontierShare`, `recordAnswer`. It imports
nothing from `domains/` or `concepts.js` — all ladder/track knowledge comes from
`tracks`. Then reduce `mastery.js` to a thin **clock-bound shim**: instantiate
the engine from the clock config (`REPRESENTATIONS`/`LADDERS` from
`concepts.js`), re-export the engine functions under their current names, and
keep the clock-specific `masteredMinuteConcepts` (= `masteredRungs` minus
`uur_24`), `pickRound`, `reviewRound`, and `hourFor` exactly as they are.
**No changes to `store.js`, `main.js`, or any test file** — `mastery.js`'s public
surface is unchanged, so all 141 tests stay green with no edits. This proves the
engine in isolation before any rewiring.

**Phase 3 — extract the clock round generator + rewire callers.** Move
`concepts.js` → `domains/clock/concepts.js`. Move `pickRound`, `reviewRound`,
`hourFor`, the `uur_24` case, and grading into `domains/clock/round.js`, rebuilt
on the engine's `chooseRungAndRole(matrix, track, rng, sessionResults, reviewPool)`
helper (add it to the engine now). Delete the `mastery.js` shim. `domains/clock/round.js` becomes the single
transitional clock module: it instantiates the clock engine from
`domains/clock/concepts.js`, re-exports the engine-bound matrix functions under
their existing names (so callers change only import paths), and owns
`pickRound`/`reviewRound`/`hourFor`/`masteredMinuteConcepts`/`grade`. Update
`store.js`/`main.js` import paths accordingly and switch grading to the domain's
`grade`. Tests: **rename** `test/mastery.test.js` → `test/clock-round.test.js`
and retarget its imports to `domains/clock/round.js` + `domains/clock/concepts.js`
(preserving all 28 tests, no logic surgery); retarget `test/concepts.test.js`
and `test/store.test.js` import paths; and **add** a small clock-agnostic
`test/engine.test.js` that drives `createAdaptiveEngine` with a synthetic
two-track config (proves the engine has no clock coupling). All tests green.
(The engine-bound re-exports in `round.js` are transitional — Phase 4's
`createGame` will own the engine instance and dissolve them.)

**Phase 4 — generalize the store.** `core/game` `createGame`. Rename
`representation→track`; replace edit/ref/time state with `round`+`answerState`;
namespace persistence via `domain`; delegate generation + grading to `domain`.
Persistence keys: core derives `${ns}-mastery-v1` and `${ns}-tracks-v1`, but a
domain may override exact keys via `domain.storageKeys`. **The clock domain must
keep `klokkie-reps-v1` (not `klokkie-tracks-v1`) for the tracks key** so existing
saved selections keep loading; the matrix key `klokkie-mastery-v1` already matches
the derived form.

**Phase 5 — generalize the shell.** `core/shell` `createPracticeApp`. Pull
Dutch strings + clock widget wiring out of `main.js` into the clock domain’s
`strings` + `renderReference`/`renderAnswer`/`submitMode`.

**Phase 6 — split the CSS.** `main.css` → `core/shell/styles.css` (Navigation,
Screens, Buttons, Game header/footer, Hold-to-check, Feedback, Setup picker,
Ladder, Complete, Clock cells/grid) + `domains/clock/styles.css` (Analog SVG,
Digital, editable Digital, Sentence). Both imported by the app entry.

**Phase 7 — arithmetic proof-of-concept.** A tiny `domains/arithmetic/` domain
(a rung ladder of increasing difficulty, free-form numeric input, `minTracks: 1`,
`submitMode: 'manual'`) that reuses the core unchanged. Not a shipped feature —
the acceptance test that the core is genuinely clock-agnostic. Add a smoke test.

## Appendix A — Phase 4 API (exact contract)

### `core/game` exports

`createStore(initial)` — the generic pub/sub store, moved verbatim from
`store.js` (`get`/`set`/`subscribe`). Unchanged.

`createGame({ engine, domain, storage })` → store object. `engine` is the core
adaptive engine (matrix ops); `domain` is the clock domain object below;
`storage` is a localStorage-like object (`getItem`/`setItem`/`removeItem`).

State shape (domain-agnostic):
```
{
  screen: 'setup' | 'game' | 'celebration' | 'session-end',
  selectedTracks: string[],
  matrix,
  roundIndex, sessionHistory, revisitQueue, roundsSinceEnqueue,
  pendingMastery, celebration,
  round: null | { attributionTrack, rungId, role, ...domainPayload },
  answerState,
  checked, correct,
}
```
Methods: `get`, `subscribe`, `toggleTrack(track)`, `goToSetup`, `startSession`,
`setAnswer(value)` (sets `answerState`), `check(explicitCorrect?)`, `nextRound`,
`continueSession`. Constants `SESSION_NOMINAL`/`SESSION_CAP` exported from
`core/game`.

Behaviour (identical to today, generalized):
- `startSession` requires `selectedTracks.length >= domain.setup.minTracks`.
- fresh round: `round = domain.pickRound(engine, matrix, selectedTracks, Math.random, sessionHistory)`; `answerState = domain.initAnswer(round)`.
- `check`: `correct = typeof explicitCorrect === 'boolean' ? explicitCorrect : domain.grade(round, answerState)`; then `engine.recordAnswer(matrix, round.attributionTrack, round.rungId, round.role, correct)`. On a wrong answer, the whole `round` object is enqueued for revisit; a revisit re-inits `answerState = domain.initAnswer(round)`.
- persistence: matrix under `domain.storageKeys.matrix`, tracks under `domain.storageKeys.tracks`; purge `domain.legacyStorageKeys` on load; loaded tracks validated against `domain.tracks` ids and `minTracks`.

### `domains/clock/index.js` exports

`round.js` gains `export const engine = …` (its existing instance, now exported)
so there is exactly one clock engine. `index.js`:
```
export { engine } from './round.js';
export const clockDomain = {
  id: 'clock',
  storageKeys: { matrix: 'klokkie-mastery-v1', tracks: 'klokkie-reps-v1' },
  legacyStorageKeys: ['klok-oefenen-scores', 'klok-oefenen-adaptive'],
  tracks: REPRESENTATIONS.map(id => ({ id, ladder: LADDERS[id] })),  // labels added in Phase 5
  setup: { minTracks: 2 },
  rung: (id) => ({ id, label: getConcept(id).label }),
  pickRound(engine, matrix, selectedTracks, rng, sessionResults) {
    const r = clockPickRound(matrix, selectedTracks, rng, sessionResults);
    return { attributionTrack: r.attributionRep, rungId: r.conceptId, role: r.role,
             editTarget: r.editTarget, refTarget: r.refTarget,
             minuteConceptId: r.minuteConceptId, referenceTime: r.time };
  },
  initAnswer: (round) => ({ ...getConcept(round.minuteConceptId).initialEditTime }),
  grade: (round, answerState) => clockGrade(round.referenceTime, answerState),
  // strings + renderReference/renderAnswer/submitMode added in Phase 5
};
```

### `store.js` (thin clock wrapper, transitional)
```
export { createStore, SESSION_NOMINAL, SESSION_CAP } from './core/game/index.js';
import { createGame } from './core/game/index.js';
import { clockDomain, engine } from './domains/clock/index.js';
export const createGameStore = () => createGame({ engine, domain: clockDomain, storage: localStorage });
```

### `main.js` state-read updates (mechanical; widgets/strings stay until Phase 5)
`selectedReps`→`selectedTracks`; `toggleRep`→`toggleTrack`;
`roundMeta.minuteConceptId`→`round.minuteConceptId`;
`editTarget`/`refTarget`→`round.editTarget`/`round.refTarget`;
`referenceTime`→`round.referenceTime`; `editTime`→`answerState`;
`setEditTime`→`setAnswer`; render-key uses `selectedTracks`.

### `store.test.js` updates (same transforms)
`selectedReps`→`selectedTracks`, `toggleRep`→`toggleTrack`,
`roundMeta.conceptId`→`round.rungId`, `roundMeta.attributionRep`→`round.attributionTrack`,
`roundMeta.role`→`round.role`, `referenceTime`→`round.referenceTime`,
`editTime`→`answerState`, `editTarget`/`refTarget`→`round.editTarget`/`round.refTarget`,
`setEditTime`→`setAnswer`. `createStore` still imported from `store.js` (re-exported).

## Appendix B — Phase 5 API (shell contract)

`core/shell/index.js` exports `createPracticeApp({ domain, engine, mount, storage })`:
builds `store = createGame({ engine, domain, storage })`, renders the screens,
subscribes with the existing render-key + focus logic, and does the initial
render. It imports NOTHING from `domains/`/`concepts.js`. All screen scaffolding
(nav, ladder dots, setup picker, two-pane game, celebration, session-end,
hold-to-check, tap shields, render-key, focus) moves here, generalized:

- **ladder dots**: `ladder = track.ladder`; `frontier = engine.frontierFor(matrix, track.id)`;
  dot title = `domain.rung(id).label`; row label = `track.label`; aria via `strings.ladderAria`.
- **setup picker**: iterate `domain.tracks`; `canStart = selectedTracks.length >= domain.setup.minTracks`.
- **game**: `refView = domain.renderReference(round)`; `ansView = domain.renderAnswer(round, answerState, { editable: !checked, onValue: v => store.setAnswer(v), onSubmit: c => store.check(c) })`.
  Answer cell first (`clock-cell--edit`/`clock-label--edit`), reference cell second; labels from the views. On re-render, call `view.destroy?.()` on the previous views.
  Footer: if `!checked` and `domain.submitMode(round) === 'manual'`, show `holdButton(strings.checkButton, () => store.check())`; if `'auto'`, no button. If `checked`: feedback + next.
- **celebration/session-end**: copy from `strings`; celebration track label via `domain.tracks` lookup by `celebration.rep`, rung via `domain.rung(celebration.conceptId)`.

### Domain additions (Phase 5)
Extend `clockDomain`:
- `tracks[i]` gains `label`, `sublabel`, `inWords` (from `main.js`'s `REP_LABELS`/`REP_SUBLABELS`/`REP_IN_WORDS`).
- `strings`: `{ navTitle, setupHeading, setupSub, startButton, setupHint, stopButton, checkButton, feedbackCorrect, feedbackWrong, nextButton, celebrationIcon:'🎉', celebrationHeading, celebrationMessage(rungLabel, trackInWords), celebrationButton, sessionEndIcon:'⭐', sessionEndHeading, sessionEndMessage(correct, total, pct), progressLabel, restartButton, changeTracksButton, scoreOf(nr, nominal)/scoreOverflow(nr)/scoreSuffix(correct,total), ladderAria(trackLabel, done, total) }`. **Every string value must be byte-identical to the current `main.js` copy.**
- `renderReference(round) → { el, label, destroy? }`, `renderAnswer(round, answerState, { editable, onValue, onSubmit }) → { el, label, destroy? }`, `submitMode(round) → 'manual'|'auto'` — implemented with the clock widgets, moving `makeComponent`, `COMPONENT_LABELS`, the `editDisplayTime` (`zin` uses `referenceTime`, else `answerState`), and the `zin` 700 ms auto-submit exactly as in current `main.js`.

### Entry point
`main.js` becomes: import `clockDomain` + `engine` from `domains/clock`, `createPracticeApp` from `core/shell`, then
`createPracticeApp({ domain: clockDomain, engine, mount: document.getElementById('app'), storage: localStorage })`.
`store.js` stays (thin wrapper) so `store.test.js` is untouched.

**Hard requirement:** the rendered DOM (element tags, class names, attributes,
text content, order) must be identical to before for every screen — this phase
is a pure relocation of the shell. No unit tests cover rendering, so diff the
behaviour by reading carefully and preserving structure exactly.

## Invariants to protect

- `npm test` green after every phase (146 tests at baseline).
- `core/**` never imports from `domains/**` or references clock concepts.
- The adaptive behaviour documented in `docs/adaptive-difficulty.md` is unchanged
  (promotion/demotion/session-controller thresholds identical).
- localStorage compatibility: existing `klokkie-mastery-v1` / `klokkie-reps-v1`
  keys keep working (the clock domain keeps `klokkie` as its namespace; the
  tracks key stays `klokkie-reps-v1` — see note in phase 4).
