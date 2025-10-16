### Context

Source: SPRINT_PROVENANCE_FIRST.md - 2) Scope (In) - NL → Cypher Query Copilot v0.6
Excerpt/why: "sandbox execution on read‑only dataset"

### Problem / Goal

Provide a read-only sandbox environment to execute generated Cypher queries safely.

### Proposed Approach

Configure a dedicated read-only connection to the graph database for sandbox queries, ensuring no write operations are possible.

### Tasks

- [ ] Configure read-only database connection for sandbox.
- [ ] Implement query execution in sandbox environment.
- [ ] Display sandbox execution results in UI.

### Acceptance Criteria

- Given a Cypher query in the sandbox, when executed, then results are returned or a safe error is displayed, and no write operations occur.
- Metrics/SLO: Sandbox execution p95 latency < 1.0s.
- Tests: Unit tests for read-only enforcement, E2E test for successful sandbox execution.
- Observability: Logs for sandbox query executions.

### Safety & Policy

- Action class: READ
- OPA rule(s) evaluated: N/A

### Dependencies

Blocks: None
Depends on: [orchestrator-core] Implement NL → Cypher generation

### DOR / DOD

- DOR: Sandbox execution design approved.
- DOD: Code merged, tests pass, documentation updated.

### Links

- Docs: SPRINT_PROVENANCE_FIRST.md
