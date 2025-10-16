### Context

Source: SPRINT_MAESTRO_COMPOSER_BACKEND.md - 0) North Star - Success at Sprint End
Excerpt/why: "A designer in the Composer UI can ... publish ... a workflow via backend APIs."

### Problem / Goal

Implement the `POST /api/workflows/:id/publish` endpoint for transitioning a workflow `draft → published`, ensuring semver bump, immutable snapshot, and provenance record creation.

### Proposed Approach

Develop an API endpoint that handles the publishing process, including versioning, creating an immutable snapshot of the workflow, and registering this event with the provenance ledger.

### Tasks

- [ ] Define API endpoint for workflow publishing.
- [ ] Implement semver bumping logic.
- [ ] Create immutable snapshot of workflow definition.
- [ ] Integrate with provenance ledger for record creation.

### Acceptance Criteria

- Given a workflow draft, when `POST /api/workflows/:id/publish` is called, then the workflow transitions to published, an immutable snapshot is created, its semver is bumped, and a provenance record is generated.
- Metrics/SLO: Workflow publishing p95 latency < 500ms.
- Tests: Unit tests for publishing logic, integration tests for API endpoint and provenance integration.
- Observability: Logs for workflow publishing events.

### Safety & Policy

- Action class: WRITE
- OPA rule(s) evaluated: N/A

### Dependencies

Blocks: None
Depends on: [orchestrator-core] Design and implement core workflow/runbook authoring service, [data-platform] Integrate provenance for published workflow versions

### DOR / DOD

- DOR: Workflow publishing API design approved.
- DOD: Code merged, tests pass, documentation updated.

### Links

- Docs: SPRINT_MAESTRO_COMPOSER_BACKEND.md
