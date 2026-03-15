---
id: "003"
title: Game Shell
variation_instructions:
 - "IMPORTANT: Implement from the inside out. Use the wishful programming approach. Write the internal code you wish you had, before you write the code that uses it."
 - "IMPORTANT: Implement the outside first, the functional code, before the internal implementation."
---

Implement a game loop. The page should have a "Start" button with nothing else. The UI language should be Dutch. After clicking start the user is shown a question ("Wat wil je oefenen?") and three choices: "Analoog", "Digitaal", "Beide"

After clicking it, the user will be shown (in a loop) pairs of a digital and an analog clock. Each time one of the two is editable, while the other is not. Which one needs to be edited should be clearly indicated. The goal is for the user to match the time that's on the other clock. The times should be randomized for each problem/round.

For this to work well the digital clock component needs to be made editable. Add controls that allow the user to increase and decrease the individual digits of the hour and minutes of the digital clock.

The main app lives on a single index page, but NO CLIENT SIDE ROUTING! The index.html should be easily servable via a static content server with no special SPA routing needed. Putting state in the querystring is allowed, but no path changes.

Use a central state store with access and mutation methods. But don't use a library for a store, only plain js.

IMPORTANT: Build a responsive, minimal and simple UI that is still consistent and tight (strong alignment and grid feel).

Create reusable components, functions and classes.
There should be some placeholder tests that run directly when executing `npm run test`.
No documentation or comments. Just the code.
