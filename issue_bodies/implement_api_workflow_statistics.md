### Context

Source: SPRINT_MAESTRO_COMPOSER_BACKEND.md - 1) Scope & Deliverables - 1.1 API Surface (v1) - Analytics & Cost
Excerpt/why: "GET /api/analytics/workflow-stats"

### Problem / Goal

Develop an API endpoint (`GET /api/analytics/workflow-stats`) to retrieve statistics about workflows.

### Proposed Approach

Implement a REST API endpoint that queries the workflow definitions and execution data to aggregate and return statistics such as total workflows, active workflows, and average completion rates.

### Tasks

- [ ] Define API endpoint for workflow statistics.
- [ ] Implement data aggregation logic for workflow stats.
- [ ] Return aggregated statistics.

### Acceptance Criteria

- Given a request, when `GET /api/analytics/workflow-stats` is called, then relevant statistics about workflows are returned.
- Metrics/SLO: Workflow stats p95 latency < 300ms.
- Tests: Unit tests for aggregation logic, integration tests for API endpoint.
- Observability: Logs for analytics requests.

### Safety & Policy

- Action class: READ
- OPA rule(s) evaluated: N/A

### Dependencies

Blocks: None
Depends on: [orchestrator-core] Design and implement core workflow/runbook authoring service

### DOR / DOD

- DOR: Workflow statistics API design approved.
- DOD: Code merged, tests pass, documentation updated.

### Links

- Docs: SPRINT_MAESTRO_COMPOSER_BACKEND.md
