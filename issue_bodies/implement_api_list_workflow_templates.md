### Context

Source: SPRINT_MAESTRO_COMPOSER_BACKEND.md - 1) Scope & Deliverables - 1.1 API Surface (v1) - Templates & Builder
Excerpt/why: "GET /api/workflow-templates"

### Problem / Goal

Develop an API endpoint (`GET /api/workflow-templates`) to list available workflow templates.

### Proposed Approach

Implement a REST API endpoint that queries the workflow templates database, returning a list of predefined templates that users can use as starting points for new workflows.

### Tasks

- [ ] Define API endpoint for listing workflow templates.
- [ ] Implement database query for workflow templates.
- [ ] Implement pagination for results.

### Acceptance Criteria

- Given a request, when `GET /api/workflow-templates` is called, then a list of available workflow templates is returned.
- Metrics/SLO: Template list p95 latency < 150ms.
- Tests: Unit tests for data retrieval, integration tests for API endpoint.
- Observability: Logs for template list requests.

### Safety & Policy

- Action class: READ
- OPA rule(s) evaluated: N/A

### Dependencies

Blocks: None
Depends on: [orchestrator-core] Design and implement core workflow/runbook authoring service

### DOR / DOD

- DOR: Workflow template list API design approved.
- DOD: Code merged, tests pass, documentation updated.

### Links

- Docs: SPRINT_MAESTRO_COMPOSER_BACKEND.md
