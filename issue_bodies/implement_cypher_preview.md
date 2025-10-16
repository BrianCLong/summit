### Context

Source: SPRINT_PROVENANCE_FIRST.md - 2) Scope (In) - NL → Cypher Query Copilot v0.6
Excerpt/why: "cost/row estimates"

### Problem / Goal

Display a preview of the generated Cypher query along with estimated cost and row count.

### Proposed Approach

Integrate with the graph database's query planner to obtain cost and row estimates for the generated Cypher, and display these in the UI.

### Tasks

- [ ] Implement cost/row estimation logic (stub).
- [ ] Design UI for displaying Cypher preview and estimates.
- [ ] Integrate estimation with NL→Cypher generation.

### Acceptance Criteria

- Given a generated Cypher query, when the preview is displayed, then accurate cost and row estimates are shown.
- Metrics/SLO: Preview generation p95 latency < 200ms.
- Tests: Unit tests for estimation logic, E2E test for preview display.
- Observability: Logs for estimation requests.

### Safety & Policy

- Action class: READ
- OPA rule(s) evaluated: N/A

### Dependencies

Blocks: None
Depends on: [orchestrator-core] Implement NL → Cypher generation

### DOR / DOD

- DOR: Cypher preview design approved.
- DOD: Code merged, tests pass, documentation updated.

### Links

- Docs: SPRINT_PROVENANCE_FIRST.md
