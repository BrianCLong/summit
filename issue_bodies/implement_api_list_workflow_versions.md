### Context

Source: SPRINT_MAESTRO_COMPOSER_BACKEND.md - 1) Scope & Deliverables - 1.1 API Surface (v1) - Versioning & Publishing
Excerpt/why: "GET /api/workflows/:id/versions — list; diff metadata."

### Problem / Goal

Develop an API endpoint (`GET /api/workflows/:id/versions`) to list versions of a workflow, including metadata for diffing.

### Proposed Approach

Implement a REST API endpoint that queries the workflow versions database, returning a list of all historical versions for a given workflow ID, along with relevant metadata for comparing versions.

### Tasks

- [ ] Define API endpoint for listing workflow versions.
- [ ] Implement database query for workflow versions.
- [ ] Include metadata for version diffing in the response.

### Acceptance Criteria

- Given a valid workflow ID, when `GET /api/workflows/:id/versions` is called, then a list of all versions with diff metadata is returned.
- Metrics/SLO: Workflow versions list p95 latency < 200ms.
- Tests: Unit tests for data retrieval, integration tests for API endpoint.
- Observability: Logs for workflow version list requests.

### Safety & Policy

- Action class: READ
- OPA rule(s) evaluated: N/A

### Dependencies

Blocks: None
Depends on: [orchestrator-core] Design and implement core workflow/runbook authoring service

### DOR / DOD

- DOR: Workflow versions API design approved.
- DOD: Code merged, tests pass, documentation updated.

### Links

- Docs: SPRINT_MAESTRO_COMPOSER_BACKEND.md
