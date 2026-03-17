---
id: "011"
title: Adaptive difficulty mode
variation_instructions:
 - "No fluff, just stuff"
---

Add an "Adaptief" option to the difficulty selection screen (the second choice, where the player currently picks a specific difficulty level). This option is available for every game mode that has multiple difficulty levels.

When the player chooses "Adaptief", the game selects problems using a difficulty level that adjusts automatically based on performance. The difficulty levels follow the same ordered progression already defined for that game mode (e.g. for the clock game: level 1 through 8 as defined in task 005).

**Starting point:** always begin at the lowest difficulty (level 1: full hours only, 12-hour).

**Progression rules:**
- On a correct answer: increase the difficulty level by 2 steps (if already near the top, clamp to the maximum).
- On an incorrect answer: decrease the difficulty level by 1 step (if already at the minimum, stay at level 1).

This asymmetry — jumping up quickly, stepping down slowly — causes the difficulty to converge on the player's current ability level.

**Completion:** The "Adaptief" mode uses the same 90%-over-last-20-problems completion criterion as regular modes. The score is tracked identically.

**Persistence:** The last difficulty level reached in an adaptive session should be stored in localStorage per game mode, so that a returning player resumes from where they converged last time rather than always starting from level 1.

**UI:** The "Adaptief" option should appear alongside the existing difficulty choices and be clearly distinguishable (e.g. a different label style or badge). During play, there is no visible difficulty indicator — the adjustment happens silently.
