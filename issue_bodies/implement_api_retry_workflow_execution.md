### Context

Source: SPRINT_MAESTRO_COMPOSER_BACKEND.md - 1) Scope & Deliverables - 1.1 API Surface (v1) - Execution
Excerpt/why: "POST /api/executions/:id/retry"

### Problem / Goal

Develop an API endpoint (`POST /api/executions/:id/retry`) to retry a failed workflow execution.

### Proposed Approach

Implement a REST API endpoint that receives a retry request for a given execution ID, identifies the failed state, and re-enqueues the workflow from the point of failure or a defined retry point.

### Tasks

- [ ] Define API endpoint for execution retry.
- [ ] Implement retry logic in workflow engine.
- [ ] Update execution status to 'retrying' or 'running'.

### Acceptance Criteria

- Given a failed workflow execution, when `POST /api/executions/:id/retry` is called, then the workflow execution is re-enqueued and attempts to resume from its failed state.
- Metrics/SLO: Execution retry p95 latency < 500ms.
- Tests: Unit tests for retry logic, integration tests for API endpoint.
- Observability: Logs for execution retry events.

### Safety & Policy

- Action class: WRITE
- OPA rule(s) evaluated: N/A

### Dependencies

Blocks: None
Depends on: [orchestrator-core] Design and implement core workflow/runbook authoring service

### DOR / DOD

- DOR: Execution retry API design approved.
- DOD: Code merged, tests pass, documentation updated.

### Links

- Docs: SPRINT_MAESTRO_COMPOSER_BACKEND.md
