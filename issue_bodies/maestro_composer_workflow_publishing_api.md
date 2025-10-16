### Context

Source: SPRINT_MAESTRO_COMPOSER_BACKEND.md - 0) North Star
Excerpt/why: "A designer in the Composer UI can ... publish ... a workflow via backend APIs."

### Problem / Goal

Develop `POST /api/workflows/:id/publish` to transition a workflow from `draft → published`, including semver bump, immutable snapshot, and provenance record creation.

### Proposed Approach

Implement the API endpoint for publishing, ensuring versioning rules are applied, an immutable snapshot is created, and a record is added to the provenance ledger.

### Tasks

- [ ] Define API endpoint `POST /api/workflows/:id/publish`.
- [ ] Implement semver bumping logic.
- [ ] Implement immutable snapshot creation.
- [ ] Integrate with provenance ledger for record creation.

### Acceptance Criteria

- Given a draft workflow, when `POST /api/workflows/:id/publish` is called, then the workflow transitions to `published`, its version is bumped, an immutable snapshot is created, and a provenance record is stored.
- Metrics/SLO: Workflow publishing p95 latency < 300ms.
- Tests: Unit tests for API endpoint, integration tests for versioning and provenance.
- Observability: Logs for workflow publishing events.

### Safety & Policy

- Action class: WRITE
- OPA rule(s) evaluated: N/A
- Compliance: Ensures auditable and traceable workflow lifecycle.

### Dependencies

Blocks: None
Depends on: [orchestrator-core] Implement core backend for Maestro Composer, [audit-telemetry] Audit workflow executions in provenance ledger

### DOR / DOD

- DOR: Workflow publishing API design approved.
- DOD: API implemented, tested, and documented.

### Links

- Docs: SPRINT_MAESTRO_COMPOSER_BACKEND.md
