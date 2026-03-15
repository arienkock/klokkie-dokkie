---
weight: 0
---

Given two implementations of the same feature (A and B), which is more faithful
to the task description and the intent behind it?

The task description is:

{{task_description}}

Consider:
- Whether all explicit requirements stated in the description are implemented
- Whether the implementation captures the underlying purpose, not just a literal
  reading of the spec
- Whether any important constraints or goals from the description are missing or
  contradicted

Respond with JSON only: {"winner": "A" | "B" | "tie", "reasoning": "..."}
