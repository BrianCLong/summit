### Context

Source: SPRINT_MAESTRO_COMPOSER_BACKEND.md - 1) Scope & Deliverables - 1.1 API Surface (v1) - Execution
Excerpt/why: "GET /api/executions — list (filters: status, startedAfter, workflowId, tenant)"

### Problem / Goal

Develop an API endpoint (`GET /api/executions`) to list workflow executions with filtering capabilities (status, startedAfter, workflowId, tenant).

### Proposed Approach

Implement a REST API endpoint that queries the workflow executions database, applying filters based on query parameters, and returns a paginated list of executions.

### Tasks

- [ ] Define API endpoint for listing executions.
- [ ] Implement database query with filtering logic.
- [ ] Implement pagination for results.

### Acceptance Criteria

- Given a request with valid filters, when `GET /api/executions` is called, then a list of executions matching the filters is returned.
- Metrics/SLO: Execution list p95 latency < 200ms for 1000 executions.
- Tests: Unit tests for filtering logic, integration tests for API endpoint.
- Observability: Logs for execution list requests.

### Safety & Policy

- Action class: READ
- OPA rule(s) evaluated: N/A

### Dependencies

Blocks: None
Depends on: [orchestrator-core] Design and implement core workflow/runbook authoring service

### DOR / DOD

- DOR: Execution list API design approved.
- DOD: Code merged, tests pass, documentation updated.

### Links

- Docs: SPRINT_MAESTRO_COMPOSER_BACKEND.md
