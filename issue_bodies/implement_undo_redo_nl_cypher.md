### Context

Source: SPRINT_PROVENANCE_FIRST.md - 2) Scope (In) - NL → Cypher Query Copilot v0.6
Excerpt/why: "undo/redo"

### Problem / Goal

Allow users to undo and redo changes in the NL → Cypher query interface.

### Proposed Approach

Implement a state management system for the query interface that tracks changes and allows for rollback and re-application of previous states.

### Tasks

- [ ] Design state management for query history.
- [ ] Implement undo functionality.
- [ ] Implement redo functionality.

### Acceptance Criteria

- Given a user makes changes to a query, when they click undo/redo, then the query state reverts/advances as expected.
- Metrics/SLO: Undo/redo operations complete instantly (< 50ms).
- Tests: Unit tests for state management, E2E test for undo/redo functionality.
- Observability: N/A

### Safety & Policy

- Action class: READ
- OPA rule(s) evaluated: N/A

### Dependencies

Blocks: None
Depends on: [orchestrator-core] Implement NL → Cypher generation

### DOR / DOD

- DOR: Undo/redo design approved.
- DOD: Code merged, tests pass, documentation updated.

### Links

- Docs: SPRINT_PROVENANCE_FIRST.md
