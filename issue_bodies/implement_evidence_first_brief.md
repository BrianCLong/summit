### Context

Source: SPRINT_PROVENANCE_FIRST.md - 2) Scope (In) - Report/Disclosure Pack v0.4
Excerpt/why: "Evidence‑first brief: timeline+graph snapshot figures; inline citation stubs"

### Problem / Goal

Generate reports with timeline and graph snapshot figures, emphasizing evidence-first presentation.

### Proposed Approach

Develop a report generation module that integrates data from the timeline and graph visualization components to create static figures within a brief.

### Tasks

- [ ] Design report brief template.
- [ ] Implement timeline snapshot integration.
- [ ] Implement graph snapshot integration.

### Acceptance Criteria

- Given a case with timeline and graph data, when a brief is generated, then it contains accurate timeline and graph snapshot figures.
- Metrics/SLO: Brief generation p95 latency < 2 seconds.
- Tests: Unit tests for figure generation, E2E test for brief content accuracy.
- Observability: Logs for report generation events.

### Safety & Policy

- Action class: READ
- OPA rule(s) evaluated: N/A

### Dependencies

Blocks: None
Depends on: [frontend] Implement Timeline shell in Tri-Pane UI, [frontend] Implement Graph shell in Tri-Pane UI

### DOR / DOD

- DOR: Evidence-first brief design approved.
- DOD: Code merged, tests pass, documentation updated.

### Links

- Docs: SPRINT_PROVENANCE_FIRST.md
