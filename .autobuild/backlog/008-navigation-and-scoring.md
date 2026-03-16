---
id: "008"
title: Navigation and scoring
variation_instructions:
 - "IMPORTANT: Think through the entire plan 2 times. Ask what could go wrong, and plan again. Only then should you start implementing. And then, when you do, implement from the inside out. Use the wishful programming approach. Write the internal code you wish you had, before you write the code that uses it."
---

Ensure there is consistent navigation buttons in all application states. In particular, inside a game, there should also be a back ("Terug") button to go back to the first game selection screen. Also, the very first screen with a start button can be removed. Instead, the initial page load should display the first game selection screen/view.

Now for the main feature in this task:
Implement score tracking. Each game keep track of the correct answers count. When the player answers 90% correct over the last 20 problems, then the game ends and the user is congratulated and with a click on an "Ander oefening kiezen" button the user is sent back to the first game selection screen.

For all game modes that the user "completes" the option should have a greenish border and text and a percentage indicator showing their score. Games that were played but not completed should have an orange border and text and also the percentage score showing their progress/mastery.

All progress/scores should be stored in localstorage.

Language of UI should be Dutch.

Use a central state store with access and mutation methods. All app state should live in the store. Exceptions only allowed for data that is temporary UI state (e.g. focus state). But don't use a library for a store, only plain js.

IMPORTANT: Build a responsive, minimal and simple UI that is still consistent and tight (strong alignment and grid feel).

Create reusable components, functions and classes.
There should be some placeholder tests that run directly when executing `npm run test`.
No documentation or comments. Just the code.
