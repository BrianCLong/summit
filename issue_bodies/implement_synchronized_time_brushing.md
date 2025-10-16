### Context

Source: SPRINT_PROVENANCE_FIRST.md - 2) Scope (In) - UI Shell: Tri‑Pane
Excerpt/why: "synchronized time brushing (basic)"

### Problem / Goal

Ensure time brushing in one pane consistently narrows results across all Tri-Pane components (Graph, Timeline, Map).

### Proposed Approach

Implement a shared state management system for time ranges that updates all connected components when a time brush interaction occurs in any pane.

### Tasks

- [ ] Define shared time state management.
- [ ] Implement time brushing in Graph, Timeline, and Map components.
- [ ] Wire components to shared time state.

### Acceptance Criteria

- Given a time range is selected in any Tri-Pane component, when the selection is made, then all other Tri-Pane components update to display data within that consistent time range.
- Metrics/SLO: Time brushing updates all panes within 200ms.
- Tests: Unit tests for shared state, E2E test for synchronized brushing.
- Observability: N/A

### Safety & Policy

- Action class: READ
- OPA rule(s) evaluated: N/A

### Dependencies

Blocks: None
Depends on: [frontend] Implement Graph shell in Tri-Pane UI, [frontend] Implement Timeline shell in Tri-Pane UI, [frontend] Implement Map shell in Tri-Pane UI

### DOR / DOD

- DOR: Synchronized time brushing design approved.
- DOD: Code merged, tests pass, documentation updated.

### Links

- Docs: SPRINT_PROVENANCE_FIRST.md
