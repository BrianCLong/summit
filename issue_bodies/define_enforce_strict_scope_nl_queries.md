### Context

Source: SPRINT_PROVENANCE_FIRST.md - 10) Risks & Mitigations
Excerpt/why: "Scope creep: lock to preview/sandbox for NL queries; no write mutations."

### Problem / Goal

Define and enforce strict scope for NL queries, limiting them to preview and sandbox environments with no write mutations.

### Proposed Approach

Implement backend checks and frontend UI constraints to prevent NL-generated queries from executing write operations or escaping the designated preview/sandbox environments.

### Tasks

- [ ] Implement backend validation for NL query scope.
- [ ] Implement frontend UI constraints for NL query scope.
- [ ] Document NL query scope limitations.

### Acceptance Criteria

- Given an NL-generated query, when executed, then it is strictly confined to read-only preview/sandbox environments and cannot trigger write mutations.
- Metrics/SLO: N/A
- Tests: Unit tests for scope enforcement, E2E test for write mutation prevention.
- Observability: Logs for attempted scope violations.

### Safety & Policy

- Action class: READ | WRITE
- OPA rule(s) evaluated: N/A

### Dependencies

Blocks: None
Depends on: [orchestrator-core] Implement NL → Cypher generation, [orchestrator-core] Implement sandbox execution for NL → Cypher queries

### DOR / DOD

- DOR: NL query scope definition approved.
- DOD: Code merged, tests pass, documentation updated.

### Links

- Docs: SPRINT_PROVENANCE_FIRST.md
