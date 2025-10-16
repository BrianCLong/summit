### Context

Source: SPRINT_MAESTRO_COMPOSER_BACKEND.md - 1) Scope & Deliverables - 1.1 API Surface (v1) - Analytics & Cost
Excerpt/why: "GET /api/analytics/execution-metrics — RED/USE metrics and estimated cost per run."

### Problem / Goal

Develop an API endpoint (`GET /api/analytics/execution-metrics`) to retrieve execution metrics, including RED/USE metrics and estimated cost per run.

### Proposed Approach

Implement a REST API endpoint that queries workflow execution data, aggregates metrics following the RED/USE methodology, and calculates estimated costs per execution.

### Tasks

- [ ] Define API endpoint for execution metrics.
- [ ] Implement RED/USE metrics aggregation.
- [ ] Implement estimated cost per run calculation.

### Acceptance Criteria

- Given a request, when `GET /api/analytics/execution-metrics` is called, then relevant execution metrics, including RED/USE and estimated costs, are returned.
- Metrics/SLO: Execution metrics p95 latency < 500ms.
- Tests: Unit tests for aggregation logic, integration tests for API endpoint.
- Observability: Logs for analytics requests.

### Safety & Policy

- Action class: READ
- OPA rule(s) evaluated: N/A

### Dependencies

Blocks: None
Depends on: [orchestrator-core] Design and implement core workflow/runbook authoring service

### DOR / DOD

- DOR: Execution metrics API design approved.
- DOD: Code merged, tests pass, documentation updated.

### Links

- Docs: SPRINT_MAESTRO_COMPOSER_BACKEND.md
