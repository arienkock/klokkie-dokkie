---
id: "007"
title: Snapping 5 minutes + touch events
variation_instructions:
 - "IMPORTANT: Implement from the inside out. Use the wishful programming approach. Write the internal code you wish you had, before you write the code that uses it."
 - "IMPORTANT: Think through the entire plan 2 times. Ask what could go wrong, and plan again. Only then should you start implementing."
---

For the games that involve 5 minute intervals, the minute hand should snap to the 5 minute points. Meaning, it should only be possible to move the minute hand into positions that represent multiples of 5.

Look at all mouse interactions (dragging, double-clicking) and ensure they work on mobile phones in a near-native way. Touching and moving the clock hands should work smoothly on touchscreens. The same goes for the words in the sentence-completion: both touching and moving, and double-tapping should work.

IMPORTANT: Build a responsive, minimal and simple UI that is still consistent and tight (strong alignment and grid feel).

Create reusable components, functions and classes.
There should be some placeholder tests that run directly when executing `npm run test`.
No documentation or comments. Just the code.
