---
id: "004"
title: Easier games
variation_instructions:
 - "IMPORTANT: Implement from the inside out. Use the wishful programming approach. Write the internal code you wish you had, before you write the code that uses it."
---

The game choices are now two step. After choosing which what to practice, now also you choose a level of difficulty. We're introducting easier levels now (it should remain easy to shuffle and inject new difficulty levels of games later).

Easiest game (for now) is the "full hours only". Minutes in the problems are always zero. For ease of dragging the hour hand, the initial position of the analog clock (when it is user editable one) should be 01:00, so the hour hand is always easily accessible for dragging. In this exercise it should be impossible to move/drag the minute hand, so that event/interaction should be disabled.

The second easiest is to add minutes to the problem question, but only in multiples of 5, and not greater than 30.

The third easiest is to have minutes now go up to 00/60 but still only in multiples of 5.

The current game (full degrees of freedom) is then the 4th level.

Language of UI should be Dutch.

Use a central state store with access and mutation methods. But don't use a library for a store, only plain js.

IMPORTANT: Build a responsive, minimal and simple UI that is still consistent and tight (strong alignment and grid feel).

Create reusable components, functions and classes.
There should be some placeholder tests that run directly when executing `npm run test`.
No documentation or comments. Just the code.
