### Context

Source: SPRINT_MAESTRO_COMPOSER_BACKEND.md - 0) North Star - Success at Sprint End
Excerpt/why: "A designer in the Composer UI can create ... a workflow via backend APIs."

### Problem / Goal

Implement the `POST /api/workflows` endpoint to allow creation of new workflow drafts, with the server assigning `workflowId` and `version=0.1.0-draft`.

### Proposed Approach

Develop the REST API endpoint for workflow creation, including logic for generating unique IDs and setting initial versioning.

### Tasks

- [ ] Define API endpoint for workflow creation.
- [ ] Implement server-side logic for ID generation and version assignment.
- [ ] Persist new workflow draft to database.

### Acceptance Criteria

- Given a valid workflow draft payload, when `POST /api/workflows` is called, then a new workflow draft is created with a unique `workflowId` and `version=0.1.0-draft`.
- Metrics/SLO: Workflow creation p95 latency < 100ms.
- Tests: Unit tests for API endpoint, integration tests for database persistence.
- Observability: Logs for workflow creation events.

### Safety & Policy

- Action class: WRITE
- OPA rule(s) evaluated: N/A

### Dependencies

Blocks: None
Depends on: [orchestrator-core] Design and implement core workflow/runbook authoring service

### DOR / DOD

- DOR: Workflow creation API design approved.
- DOD: Code merged, tests pass, documentation updated.

### Links

- Docs: SPRINT_MAESTRO_COMPOSER_BACKEND.md
