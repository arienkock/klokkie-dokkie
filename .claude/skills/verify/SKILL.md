---
name: verify
description: Build, run, and drive the Klokkie-Dokkie app to verify changes end-to-end.
---

# Verifying Klokkie-Dokkie

App lives in `src/` (Vite + vanilla JS, no framework).

## Launch

```bash
cd src && npm install && npm run dev   # serves http://localhost:5173
```

## Drive (headless Chromium via Playwright)

Install `playwright-core` in a scratch dir and launch with
`chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })`.

Flow worth driving:
1. Setup screen: `.rep-card` buttons toggle representations; deselect the
   "Zin" card to keep rounds on analog/digital (the zin editor auto-checks
   on the last word drop, no check button).
2. `text=Start oefenen` starts a session; game screen shows `.game-score`
   ("Vraag N van 20"), the editable clock, and the footer.
3. Check button is hold-to-confirm (`.btn--hold`): use `mouse.down()`,
   `waitForTimeout(700)`, `mouse.up()`. A plain `.click()` deliberately does
   nothing except show the `.hold-hint`.
4. After grading, `.feedback` and "Volgende" render; "Volgende" ignores
   pointer clicks for ~500ms after it appears (tap shield) — wait 600ms
   before clicking it. Keyboard Enter is exempt from both guards.

## Gotchas

- State persists in localStorage (`klokkie-mastery-v1`, `klokkie-reps-v1`);
  a fresh browser context gives a clean ladder.
- The first "hele uren" round can have the answer equal to the initial edit
  time (01:00), so grading an untouched clock may legitimately be correct.
