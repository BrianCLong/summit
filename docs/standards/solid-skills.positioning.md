# Positioning: Solid Skills in Summit

## Why this exists
We are importing the *spirit* of the [ramziddin/solid-skills](https://github.com/ramziddin/solid-skills) agent skill into Summit to operationalize "senior engineer" quality heuristics into our CI pipeline.

## Goals
1. **Deterministic Verification:** Move from subjective "clean code" reviews to objective, machine-verifiable signals.
2. **Drift Detection:** Track if we are accumulating technical debt (e.g., changes without tests) over time.
3. **Agent Guidance:** Provide a clear standard that coding agents can read and follow.

## Non-Goals
- **Not a Linter Replacement:** We still use ESLint/Ruff for syntax. Solid Gate focuses on *engineering practices* (TDD, architectural safety).
- **Not a Blocker (Initially):** We value merge velocity. This gate starts as advisory evidence.
