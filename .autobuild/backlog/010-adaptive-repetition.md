---
id: "010"
title: Adaptive repetition
---

Implement adaptive problem repetition within each game mode. When a player answers a problem incorrectly, that problem is added to a revisit queue. After 2 other problems have been presented, the incorrectly answered problem is reintroduced. The revisit queue has a maximum length of 5 items; if the queue is full, the oldest item is dropped to make room for the new one.

Problems pulled from the revisit queue should be visually indistinguishable from regular problems — no indication is shown to the player that this is a repeated problem.

The revisit queue is per game session and does not persist across sessions. It should be stored in the central state store alongside other game state.
