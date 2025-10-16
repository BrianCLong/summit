### Context

Source: SPRINT_MAESTRO_COMPOSER_BACKEND.md - 1) Scope & Deliverables - 1.1 API Surface (v1) - Human‑in‑the‑Loop
Excerpt/why: "GET /api/human-tasks/:id"

### Problem / Goal

Develop an API endpoint (`GET /api/human-tasks/:id`) to retrieve a specific human task.

### Proposed Approach

Implement a REST API endpoint that queries the human tasks database, retrieving detailed information about a single human task by its ID.

### Tasks

- [ ] Define API endpoint for reading a specific human task.
- [ ] Implement database query to retrieve human task details.
- [ ] Handle cases where human task ID is not found.

### Acceptance Criteria

- Given a valid human task ID, when `GET /api/human-tasks/:id` is called, then the details of the specific human task are returned.
- Metrics/SLO: Human task read p95 latency < 100ms.
- Tests: Unit tests for data retrieval, integration tests for API endpoint.
- Observability: Logs for human task read requests.

### Safety & Policy

- Action class: READ
- OPA rule(s) evaluated: N/A

### Dependencies

Blocks: None
Depends on: [orchestrator-core] Design and implement core workflow/runbook authoring service

### DOR / DOD

- DOR: Human task read API design approved.
- DOD: Code merged, tests pass, documentation updated.

### Links

- Docs: SPRINT_MAESTRO_COMPOSER_BACKEND.md
