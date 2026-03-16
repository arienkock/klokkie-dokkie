---
id: "005"
title: 24-hour clock difficulty levels
variation_instructions:
 - "IMPORTANT: Implement from the inside out. Use the wishful programming approach. Write the internal code you wish you had, before you write the code that uses it."
---

Add a second dimension to the difficulty system: whether the hour can exceed 12 (i.e. PM/24-hour territory).

Currently the game only generates times where the hour is between 1 and 12. This is the natural starting point because the analog clock only shows 12-hour faces, and matching logic already accounts for AM/PM ambiguity. However, introducing hours above 12 on the digital clock is itself a difficulty step, because the learner must understand that e.g. 14:30 on the digital clock maps to 2:30 on the analog clock.

The previosuly implemented difficulty levels now each exist in two variants:

- **12-hour variant** (hours 1–12): the generated time's hour is always between 1 and 12.
- **24-hour variant** (hours 1–24, excluding 0 / midnight for now): the generated time's hour can be anywhere from 1 to 23.

The progression of combined difficulty should be:

1. Full hours only, 12-hour (hours 1–12, minutes = 0)
2. Minutes multiples of 5 up to 30, 12-hour
3. Minutes multiples of 5 up to 60, 12-hour
4. Full minutes freedom, 12-hour
5. Full hours only, 24-hour (hours 1–23, minutes = 0)
6. Minutes multiples of 5 up to 30, 24-hour
7. Minutes multiples of 5 up to 60, 24-hour
8. Full minutes freedom, 24-hour

The level selection UI should clearly communicate this two-dimensional nature. Present it as two sequential choices: first the minutes difficulty (the four levels from task 004), then whether hours are 12-hour or 24-hour. The 24-hour choice should only be available after the user has demonstrated awareness of what 24-hour time means (i.e. it is not the default starting point).

The matching logic for "is the answer correct" already handles the AM/PM ambiguity on the analog clock — this must continue to work correctly for all 24-hour generated times. For example, if the generated time is 14:00 and the user edits the analog clock to show 2:00, that should be accepted as correct.

Language of UI should be Dutch.

Use a central state store with access and mutation methods. But don't use a library for a store, only plain js.

IMPORTANT: Build a responsive, minimal and simple UI that is still consistent and tight (strong alignment and grid feel).

No documentation or comments. Just the code.
