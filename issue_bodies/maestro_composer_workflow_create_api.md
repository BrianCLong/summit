### Context

Source: SPRINT_MAESTRO_COMPOSER_BACKEND.md - 0) North Star
Excerpt/why: "A designer in the Composer UI can create ... a workflow via backend APIs."

### Problem / Goal

Develop `POST /api/workflows` to create draft workflows, with the server assigning `workflowId` and `version=0.1.0-draft`.

### Proposed Approach

Implement the API endpoint for workflow creation, including logic for generating unique IDs and setting initial versioning.

### Tasks

- [ ] Define API endpoint for workflow creation.
- [ ] Implement server-side logic for ID generation and version assignment.
- [ ] Persist new workflow draft to database.

### Acceptance Criteria

- Given a valid workflow draft payload, when `POST /api/workflows` is called, then a new draft workflow is created with a unique `workflowId` and `version=0.1.0-draft`.
- Metrics/SLO: Workflow creation p95 latency < 100ms.
- Tests: Unit tests for API endpoint, integration tests for ID/version assignment.
- Observability: Logs for workflow creation events.

### Safety & Policy

- Action class: WRITE
- OPA rule(s) evaluated: N/A

### Dependencies

Blocks: None
Depends on: [orchestrator-core] Implement core backend for Maestro Composer

### DOR / DOD

- DOR: Workflow creation API design approved.
- DOD: API implemented, tested, and documented.

### Links

- Docs: SPRINT_MAESTRO_COMPOSER_BACKEND.md
