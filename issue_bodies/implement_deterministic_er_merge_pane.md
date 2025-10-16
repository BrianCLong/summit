### Context

Source: SPRINT_PROVENANCE_FIRST.md - 12) Stretch
Excerpt/why: "Deterministic ER merge pane with explainability scorecard."

### Problem / Goal

Develop a UI pane for deterministic Entity Resolution merges, including an explainability scorecard (Stretch Goal).

### Proposed Approach

Design and implement a frontend component that displays merge suggestions based on deterministic rules, along with a scorecard explaining the merge rationale and allowing for review.

### Tasks

- [ ] Design ER merge pane UI.
- [ ] Implement deterministic merge suggestion display.
- [ ] Implement explainability scorecard display.

### Acceptance Criteria

- Given deterministic ER merge suggestions, when the pane is viewed, then it displays merge candidates with an explainability scorecard.
- Metrics/SLO: Merge pane display p95 latency < 500ms.
- Tests: Unit tests for scorecard logic, E2E test for pane display.
- Observability: N/A

### Safety & Policy

- Action class: READ | WRITE
- OPA rule(s) evaluated: N/A

### Dependencies

Blocks: None
Depends on: [data-platform] Implement schema mapping with AI suggestions for Ingest Wizard

### DOR / DOD

- DOR: ER merge pane design approved.
- DOD: Code merged, tests pass, documentation updated.

### Links

- Docs: SPRINT_PROVENANCE_FIRST.md
