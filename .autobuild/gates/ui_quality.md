---
---

Perform visual quality assurance on the implemented UI by launching the app and inspecting it in a browser. Use the browser and take screenshots as you interact, so you can visually inspect the UI in different states.

Steps:
1. Start the development server for the workspace (e.g. `npm run dev` or equivalent) in the background.
2. Open the app in a browser and navigate through all affected pages or views.
3. Inspect for visual defects, focusing on:
   - **Occlusion**: elements overlapping or hiding other interactive/readable content
   - **Misalignment**: components that are visibly out of place, skewed, or not following the layout grid
   - **Overflow/clipping**: text or UI elements that are cut off or extend beyond their containers
   - **Broken layout**: sections that collapse, stack incorrectly, or lose structure at default viewport size
   - **Readability**: contrast or font rendering issues that make content hard to read
4. Interact with the affected functionality to surface any layout shifts or rendering glitches triggered by user interaction.

If there are no UI changes in this implementation, respond with PASS.

Respond with JSON only: {"grade": "PASS" | "FAIL", "reasoning": "..."}
