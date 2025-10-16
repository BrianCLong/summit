### Context

Source: SPRINT_MAESTRO_COMPOSER_BACKEND.md - 1) Scope & Deliverables - 1.1 API Surface (v1) - Execution
Excerpt/why: "GET /api/executions/:id — state + step timeline + logs (SSE channel `/api/executions/:id/stream`)."

### Problem / Goal

Develop an API endpoint (`GET /api/executions/:id`) to retrieve the state, step timeline, and logs for a specific execution.

### Proposed Approach

Implement a REST API endpoint that queries the workflow executions database, retrieving detailed information about a single execution, including its current state, a chronological timeline of steps, and associated logs.

### Tasks

- [ ] Define API endpoint for reading specific execution details.
- [ ] Implement database query for execution state and timeline.
- [ ] Implement log retrieval for specific execution.

### Acceptance Criteria

- Given a valid execution ID, when `GET /api/executions/:id` is called, then the execution's state, step timeline, and logs are returned.
- Metrics/SLO: Execution detail read p95 latency < 150ms.
- Tests: Unit tests for data retrieval, integration tests for API endpoint.
- Observability: Logs for execution detail requests.

### Safety & Policy

- Action class: READ
- OPA rule(s) evaluated: N/A

### Dependencies

Blocks: None
Depends on: [orchestrator-core] Design and implement core workflow/runbook authoring service

### DOR / DOD

- DOR: Execution detail API design approved.
- DOD: Code merged, tests pass, documentation updated.

### Links

- Docs: SPRINT_MAESTRO_COMPOSER_BACKEND.md
