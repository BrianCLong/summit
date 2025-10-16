### Context

Source: SPRINT_MAESTRO_COMPOSER_BACKEND.md - 1) Scope & Deliverables - 1.1 API Surface (v1) - Workflow CRUD
Excerpt/why: "GET /api/workflows — list (filters: owner, tag, state, updatedSince)"

### Problem / Goal

Develop an API endpoint (`GET /api/workflows`) to list workflows with filtering capabilities (owner, tag, state, updatedSince).

### Proposed Approach

Implement a REST API endpoint that queries the workflow definitions database, applying filters based on query parameters, and returns a paginated list of workflows.

### Tasks

- [ ] Define API endpoint for listing workflows.
- [ ] Implement database query with filtering logic.
- [ ] Implement pagination for results.

### Acceptance Criteria

- Given a request with valid filters, when `GET /api/workflows` is called, then a list of workflows matching the filters is returned.
- Metrics/SLO: Workflow list p95 latency < 200ms for 1000 workflows.
- Tests: Unit tests for filtering logic, integration tests for API endpoint.
- Observability: Logs for workflow list requests.

### Safety & Policy

- Action class: READ
- OPA rule(s) evaluated: N/A

### Dependencies

Blocks: None
Depends on: [orchestrator-core] Design and implement core workflow/runbook authoring service

### DOR / DOD

- DOR: Workflow list API design approved.
- DOD: Code merged, tests pass, documentation updated.

### Links

- Docs: SPRINT_MAESTRO_COMPOSER_BACKEND.md
