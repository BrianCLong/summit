### Context

Source: SPRINT_MAESTRO_COMPOSER_BACKEND.md - 1) Scope & Deliverables - 1.1 API Surface (v1) - Workflow CRUD
Excerpt/why: "GET /api/workflows/:id — read including latest **published** and **draft**."

### Problem / Goal

Develop an API endpoint (`GET /api/workflows/:id`) to retrieve a specific workflow, including its latest published and draft versions.

### Proposed Approach

Implement a REST API endpoint that queries the workflow definitions database, retrieving both the active draft and the most recently published immutable version of a given workflow ID.

### Tasks

- [ ] Define API endpoint for reading a specific workflow.
- [ ] Implement database query to retrieve draft and published versions.
- [ ] Handle cases where workflow ID is not found.

### Acceptance Criteria

- Given a valid workflow ID, when `GET /api/workflows/:id` is called, then the latest published and draft versions of the workflow are returned.
- Metrics/SLO: Workflow read p95 latency < 100ms.
- Tests: Unit tests for data retrieval, integration tests for API endpoint.
- Observability: Logs for workflow read requests.

### Safety & Policy

- Action class: READ
- OPA rule(s) evaluated: N/A

### Dependencies

Blocks: None
Depends on: [orchestrator-core] Design and implement core workflow/runbook authoring service

### DOR / DOD

- DOR: Workflow read API design approved.
- DOD: Code merged, tests pass, documentation updated.

### Links

- Docs: SPRINT_MAESTRO_COMPOSER_BACKEND.md
