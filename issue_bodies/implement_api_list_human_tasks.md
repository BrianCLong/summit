### Context

Source: SPRINT_MAESTRO_COMPOSER_BACKEND.md - 1) Scope & Deliverables - 1.1 API Surface (v1) - Human‑in‑the‑Loop
Excerpt/why: "GET /api/human-tasks"

### Problem / Goal

Develop an API endpoint (`GET /api/human-tasks`) to list human tasks.

### Proposed Approach

Implement a REST API endpoint that queries the human tasks database, applying filters based on query parameters, and returns a paginated list of tasks.

### Tasks

- [ ] Define API endpoint for listing human tasks.
- [ ] Implement database query with filtering logic.
- [ ] Implement pagination for results.

### Acceptance Criteria

- Given a request with valid filters, when `GET /api/human-tasks` is called, then a list of human tasks matching the filters is returned.
- Metrics/SLO: Human task list p95 latency < 200ms.
- Tests: Unit tests for filtering logic, integration tests for API endpoint.
- Observability: Logs for human task list requests.

### Safety & Policy

- Action class: READ
- OPA rule(s) evaluated: N/A

### Dependencies

Blocks: None
Depends on: [orchestrator-core] Design and implement core workflow/runbook authoring service

### DOR / DOD

- DOR: Human task list API design approved.
- DOD: Code merged, tests pass, documentation updated.

### Links

- Docs: SPRINT_MAESTRO_COMPOSER_BACKEND.md
