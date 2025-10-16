### Context

Source: SPRINT_PROVENANCE_FIRST.md - 2) Scope (In) - UI Shell: Tri‑Pane
Excerpt/why: "command palette stub"

### Problem / Goal

Create a placeholder for a command palette in the Tri-Pane UI.

### Proposed Approach

Implement a basic modal or overlay that can be triggered by a keyboard shortcut and displays a list of dummy commands.

### Tasks

- [ ] Design command palette UI (modal/overlay).
- [ ] Implement keyboard shortcut trigger.
- [ ] Display dummy command list.

### Acceptance Criteria

- Given a user presses the designated keyboard shortcut, when the shortcut is pressed, then the command palette stub is displayed.
- Metrics/SLO: Command palette display p95 latency < 100ms.
- Tests: Unit tests for trigger, E2E test for display.
- Observability: N/A

### Safety & Policy

- Action class: READ
- OPA rule(s) evaluated: N/A

### Dependencies

Blocks: None
Depends on: None

### DOR / DOD

- DOR: Command palette stub design approved.
- DOD: Code merged, tests pass, documentation updated.

### Links

- Docs: SPRINT_PROVENANCE_FIRST.md
