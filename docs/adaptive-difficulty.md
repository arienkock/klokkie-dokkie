# Adaptive difficulty: concept ladder × representations

## Motivation

The original difficulty model had two coarse dimensions — 4 minute levels × 2 hour
modes — and an adaptive mode that walked a flattened list of those 8 combinations,
moving +2 levels on any correct answer and -1 on any wrong one. This produced
jumps that are too large for a child:

- Level 1 → 2 introduced *all* of "vijf over", "tien over", "kwart over", "voor half"
  and "half" at once.
- Level 2 → 3 introduced the entire second half of the hour, which in Dutch is the
  hardest part ("vijf over half", "tien voor").
- The +2/-1 stepping itself oscillated: one lucky answer skipped a whole level.

This redesign replaces both dimensions with a single **concept ladder** tracked
**per representation**, targeting a steady ~80% success rate.

## Concept ladder

Each rung introduces exactly one new concept. A generated time belongs to exactly
one concept.

| # | id              | Minutes                | New Dutch construction        |
|---|-----------------|------------------------|-------------------------------|
| 1 | `heel_uur`      | 0                      | "twee uur"                    |
| 2 | `half_uur`      | 30                     | "half drie"                   |
| 3 | `kwartier`      | 15, 45                 | "kwart over / kwart voor"     |
| 4 | `uur_24`        | (digital only, see below) | reading 13:00–23:59        |
| 5 | `voor_half`     | 5, 10, 20, 25          | "vijf over" / "vijf voor half"|
| 6 | `na_half`       | 35, 40, 50, 55         | "vijf over half" / "tien voor"|
| 7 | `vrij`          | any non-multiple of 5  | "zeven over", "twaalf voor half" |

Hours are drawn 1–12 for every concept except `uur_24`.

### Representations

The three representations — `analog`, `digital`, `zin` — are an orthogonal
dimension. Mastery is tracked in a matrix `mastery[representation][concept]`,
because the same time can be much harder in one representation than another
(building "vijf over half acht" as a sentence vs. dialing :35 on an analog clock).

- The `analog` and `zin` ladders have 6 rungs (no `uur_24` — the dial and the
  sentence vocabulary are inherently 12-hour).
- The `digital` ladder has all 7 rungs.

### The `uur_24` rung (documented exception)

Reading a 24-hour time is a *reading* skill: the reference shows e.g. `14:30` and
the child produces "half drie" on the analog dial or as a sentence. Grading is
mod-12 (as today), so producing 24h on the digital clock is not distinguishable
from 12h and cannot be tested as a production skill.

Therefore `uur_24` rounds are generated with **digital as the reference**
(hours 13–23, minutes drawn from digital's already-mastered minute concepts), and
their result is attributed to `mastery.digital.uur_24` — the one exception to the
edit-target attribution rule below. Once mastered, any round with a digital
reference may roll hours 13–23.

## Round generation

Setup is a single **representation picker** (minimum two of analog / digital /
zin). The game is always adaptive; there is no manual level selection.

Per round:

1. Pick the **edit target** uniformly from the selected representations, and the
   **reference** uniformly from the remaining selected ones.
2. Look up the edit target's **frontier**: the first unmastered rung of its ladder.
3. With probability equal to the current **frontier share**, generate a frontier-
   concept question; otherwise generate a **review** question with a concept drawn
   uniformly from that representation's mastered rungs. (No mastered rungs → always
   frontier; ladder complete → always review.)
4. Special case: if digital is selected and `mastery.digital.uur_24` is the digital
   frontier, `uur_24` rounds use digital as the reference (step 1 inverted).

The analog clock's minute-hand snapping follows the round's concept (`heel_uur`:
hour hand only, `half_uur`: snap 30, `kwartier`: snap 15, `voor_half`/`na_half`/
`uur_24`: snap 5, `vrij`: snap 1), as the per-level snapping does today.

The existing revisit queue (missed problems re-asked a couple of rounds later)
is kept unchanged.

## Scoring & attribution

Each answer is attributed to **the edit target representation only** (producing
the answer is the skill under test; the reference is assumed readable). It updates
the matrix cell for the round's concept.

Every cell keeps a small rolling window of recent answers, split by role:

- `window`: last 8 answers given while the concept was the **frontier**.
- `review`: last 4 answers given as **review** of a mastered concept.

## Adaptivity rules (target: ~80% overall success)

**Promotion** — a frontier concept is mastered when its last 3 frontier answers
are all correct (fast track), or its last 5 frontier answers contain ≥ 4 correct
(≥ 80%). The fast track lets a child who is cruising climb several rungs within
a single game instead of grinding 5 answers per representation per rung.
Promotion is only evaluated on a correct answer, so a celebration never
immediately follows a miss (likewise demotion and review slippage are only
evaluated on wrong answers). This fires a `mastered` event (celebration).

**Session controller (frontier share)** — the frontier share is steered per
round by the current game's results, so difficulty adapts *within* a session
rather than only across sessions (per-cell windows fill far too slowly for
that: with 3 representations a 20-round game gives each cell only a handful of
answers). The share follows the wrong-answer count over the last 6 session
answers, all representations combined; with fewer than 4 answers so far it
stays at the 50% default:

| wrong in last 6 | frontier share |
|-----------------|----------------|
| 0               | 85%            |
| 1               | 50%            |
| 2               | 35%            |
| ≥ 3             | 20%            |

A flawless run quickly becomes nearly all frontier questions — combined with
fast-track promotion, a strong player meets new concepts within the same game —
while a rough patch backs off to mostly review until accuracy recovers toward
the 80% target. The session history resets each game; long-term state lives
only in the mastery matrix.

**Per-concept floor** — independently of the session controller, if a frontier
cell's last 4 answers contain ≥ 3 wrong, its share is capped at 25% until the
recent window recovers (≥ 2 correct in the last 4). The child sees that
specific hard concept less often even when the session as a whole is going
fine, and accuracy recovers without a formal demotion.

**Demotion (hard lever)** — if a frontier cell's window holds ≥ 8 answers with
≤ 3 correct, demote: the *previous* rung is un-mastered (becoming the new
frontier) and **both** cells' windows reset — re-promotion requires a fresh
demonstration. At rung 1 there is nothing to demote to; the reduced frontier
share is the floor.

**Review slippage** — if a mastered concept's last 4 review answers contain
≥ 3 wrong, it is un-mastered (window reset), pulling the frontier back to it.
A single slip never demotes.

## Session shape

- Nominal length: 20 rounds.
- **End on a high note**: after round 20, the session continues until the next
  correct answer, then ends (hard cap at 25 rounds).
- When a concept is newly mastered mid-session, a **celebration** is shown
  ("Nieuw niveau!"), then the session continues.
- The session-end screen summarizes the session score and shows ladder progress
  per representation.

## Persistence

All state lives in localStorage:

- `klokkie-mastery-v1`: the full mastery matrix (windows included), saved after
  every answer, so a session can stop anytime and resume where it left off.
- `klokkie-reps-v1`: the last representation selection, pre-selected next visit.

The legacy keys (`klok-oefenen-scores`, `klok-oefenen-adaptive`) are removed on
first load; progress starts fresh under the new model.

## Module layout

- `src/concepts.js` — concept definitions: id, label, minute generator, analog
  snapping config, ladder order, per-representation ladders. Replaces
  `difficulties.js`.
- `src/mastery.js` — pure functions over the mastery matrix: `createMatrix()`,
  `frontierFor(matrix, rep)`, `sessionShare(sessionResults)`,
  `frontierShare(cell, sessionResults)`, `pickRound(matrix, reps, rng, sessionResults)`,
  `recordAnswer(matrix, rep, concept, role, correct)` → `{ matrix, events }`.
  No DOM, no storage; fully unit-tested.
- `src/store.js` — game flow: representation selection, round lifecycle, session
  shape, celebration events, persistence.
- `src/main.js` — screens: representation picker, game, celebration, session end.
