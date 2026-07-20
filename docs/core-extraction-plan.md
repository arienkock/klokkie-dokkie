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

**Phase 2 — parameterize the engine.** Convert `mastery.js` into
`core/engine` `createAdaptiveEngine(config)`; remove its `concepts.js` import.
Add `chooseRungAndRole` + `masteredRungs`. Keep `pickRound`/grading in the clock
domain for now (thin wrapper) so tests stay green. Adapt `mastery.test.js`.

**Phase 3 — extract the clock round generator.** Move `pickRound`,
`reviewRound`, `hourFor`, the `uur_24` case, and grading into
`domains/clock/round.js`, built on the engine helpers. Move `concepts.js` to
`domains/clock/`.

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

## Invariants to protect

- `npm test` green after every phase (146 tests at baseline).
- `core/**` never imports from `domains/**` or references clock concepts.
- The adaptive behaviour documented in `docs/adaptive-difficulty.md` is unchanged
  (promotion/demotion/session-controller thresholds identical).
- localStorage compatibility: existing `klokkie-mastery-v1` / `klokkie-reps-v1`
  keys keep working (the clock domain keeps `klokkie` as its namespace; the
  tracks key stays `klokkie-reps-v1` — see note in phase 4).
