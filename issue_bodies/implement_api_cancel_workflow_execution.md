### Context

Source: SPRINT_MAESTRO_COMPOSER_BACKEND.md - 1) Scope & Deliverables - 1.1 API Surface (v1) - Execution
Excerpt/why: "POST /api/executions/:id/cancel"

### Problem / Goal

Develop an API endpoint (`POST /api/executions/:id/cancel`) to cancel a running workflow execution.

### Proposed Approach

Implement a REST API endpoint that receives a cancellation request for a given execution ID, triggers the workflow engine to gracefully stop the execution, and updates its status.

### Tasks

- [ ] Define API endpoint for execution cancellation.
- [ ] Implement cancellation logic in workflow engine.
- [ ] Update execution status to 'cancelled'.

### Acceptance Criteria

- Given a running workflow execution, when `POST /api/executions/:id/cancel` is called, then the workflow execution is gracefully stopped and its status is updated to cancelled.
- Metrics/SLO: Execution cancellation p95 latency < 500ms.
- Tests: Unit tests for cancellation logic, integration tests for API endpoint.
- Observability: Logs for execution cancellation events.

### Safety & Policy

- Action class: WRITE
- OPA rule(s) evaluated: N/A

### Dependencies

Blocks: None
Depends on: [orchestrator-core] Design and implement core workflow/runbook authoring service

### DOR / DOD

- DOR: Execution cancellation API design approved.
- DOD: Code merged, tests pass, documentation updated.

### Links

- Docs: SPRINT_MAESTRO_COMPOSER_BACKEND.md
