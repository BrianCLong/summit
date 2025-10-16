### Context

Source: SPRINT_PROVENANCE_FIRST.md - 2) Scope (In) - NL → Cypher Query Copilot v0.6
Excerpt/why: "diff vs. hand‑written query"

### Problem / Goal

Provide a visual diff between a generated Cypher query and a hand-written query.

### Proposed Approach

Integrate a diffing library into the UI to highlight differences between two Cypher query strings.

### Tasks

- [ ] Select a diffing library.
- [ ] Implement diffing logic for Cypher queries.
- [ ] Design and implement UI for displaying the diff.

### Acceptance Criteria

- Given a generated query and a hand-written query, when the diff view is activated, then differences are clearly highlighted.
- Metrics/SLO: Diff computation and display p95 latency < 300ms.
- Tests: Unit tests for diffing logic, E2E test for diff view display.
- Observability: N/A

### Safety & Policy

- Action class: READ
- OPA rule(s) evaluated: N/A

### Dependencies

Blocks: None
Depends on: [orchestrator-core] Implement NL → Cypher generation

### DOR / DOD

- DOR: Diff view design approved.
- DOD: Code merged, tests pass, documentation updated.

### Links

- Docs: SPRINT_PROVENANCE_FIRST.md
