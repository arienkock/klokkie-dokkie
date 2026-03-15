---
id: "002"
title: Clock components
extensibility_scenario: |
  Reusing these components in different contexts and having multiple on the page should work seamelessly with minimal duplication.
variation_instructions:
 - "IMPORTANT: Implement from the inside out. Use the wishful programming approach. Write the internal code you wish you had, before you write the code that uses it."
#  - "IMPORTANT: Implement the outside first, the functional code, before the internal implementation."
---
Create two clock components: one analog, one digital.
They both should take the same time representation as a property. Granularity = hours and minutes (no seconds).
Digital clock should be a 24 hour clock (NO AM/PM).
Analog clock should have the option to show or hide the numbers on the face. If no numbers there should be other indicators on the hours. The annalog clock's hands should be moveable via drag and drop. The hour hand should update if the minute hand moves, and the hour value of the shared state should update if the minute hand crosses the minute threshold. The minutes unput field should always display two numbers (just like the digital clock), and should have similar hour wrapping behavior.

Create an app shell where we can display one of each of these components and inputs so we can update the time and see the responsive behavior. It should be easy to change the hours and numbers using HTML number input types with appropriate min max values. The state should always be in synch, whether the analog hands are oved, or changed via the inputs, the time in the store should always be in synch with the UI.

Use a central state store with access and mutation methods. But don't use a library for a store, only plain js.

IMPORTANT: Build a responsive, minimal and simple UI that is still consistent and tight (strong alignment and grid feel).

Create reusable components, functions and classes.
There should be some placeholder tests that run directly when executing `npm run test`.
No documentation or comments. Just the code.
