### Context

Source: SPRINT_MAESTRO_COMPOSER_BACKEND.md - 0) North Star - Success at Sprint End
Excerpt/why: "A designer in the Composer UI can ... validate ... a workflow via backend APIs."

### Problem / Goal

Implement the `POST /api/workflows/validate` endpoint for DAG compilation and validation, ensuring invalid graphs are rejected with actionable errors.

### Proposed Approach

Develop an API endpoint that receives a workflow definition, compiles its DAG, performs checks (cycle, unreachable steps, type), and returns validation results.

### Tasks

- [ ] Define API endpoint for workflow validation.
- [ ] Implement DAG compilation and validation logic.
- [ ] Return actionable error messages for invalid graphs.

### Acceptance Criteria

- Given an invalid workflow definition, when `POST /api/workflows/validate` is called, then the request is rejected with clear, actionable error messages.
- Metrics/SLO: Workflow validation p95 latency < 200ms.
- Tests: Unit tests for validation logic, integration tests for API endpoint.
- Observability: Logs for validation requests and errors.

### Safety & Policy

- Action class: READ
- OPA rule(s) evaluated: N/A

### Dependencies

Blocks: None
Depends on: [orchestrator-core] Design and implement core workflow/runbook authoring service, [orchestrator-core] Implement DAG compiler for workflow definitions

### DOR / DOD

- DOR: Workflow validation API design approved.
- DOD: Code merged, tests pass, documentation updated.

### Links

- Docs: SPRINT_MAESTRO_COMPOSER_BACKEND.md
