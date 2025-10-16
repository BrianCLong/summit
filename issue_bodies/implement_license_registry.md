### Context

Source: SPRINT_PROVENANCE_FIRST.md - 6) Work Breakdown (By Workstream) - Security & Governance
Excerpt/why: "License registry"

### Problem / Goal

Create a system to register and manage data licenses, associating them with ingested data.

### Proposed Approach

Develop a dedicated service or module for license management, including CRUD operations for license definitions and linking licenses to data assets.

### Tasks

- [ ] Design license registry schema.
- [ ] Implement API for license registration and retrieval.
- [ ] Integrate with data ingest process to link licenses.

### Acceptance Criteria

- Given a new license, when registered, then it is stored and retrievable; when data is ingested, then it can be correctly associated with a license.
- Metrics/SLO: License registration p95 latency < 100ms.
- Tests: Unit tests for registry functionality, E2E test for license association.
- Observability: Logs for license management events.

### Safety & Policy

- Action class: WRITE
- OPA rule(s) evaluated: N/A

### Dependencies

Blocks: None
Depends on: None

### DOR / DOD

- DOR: License registry design approved.
- DOD: Code merged, tests pass, documentation updated.

### Links

- Docs: SPRINT_PROVENANCE_FIRST.md
