### Context

Source: SPRINT_MAESTRO_COMPOSER_BACKEND.md - 0) North Star - Success at Sprint End
Excerpt/why: "A designer in the Composer UI can ... execute a workflow via backend APIs."

### Problem / Goal

Implement the `POST /api/workflows/:id/execute` endpoint for enqueuing workflow execution, returning an `executionId`.

### Proposed Approach

Develop an API endpoint that receives an execution request, validates it, enqueues the workflow for asynchronous processing, and immediately returns a unique execution identifier.

### Tasks

- [ ] Define API endpoint for workflow execution enqueue.
- [ ] Implement request validation and enqueue logic.
- [ ] Generate and return `executionId`.

### Acceptance Criteria

- Given a valid workflow ID, when `POST /api/workflows/:id/execute` is called, then the workflow is enqueued for execution and a unique `executionId` is returned.
- Metrics/SLO: p95 `POST /api/workflows/:id/execute` < 300ms enqueue.
- Tests: Unit tests for enqueue logic, integration tests for API endpoint.
- Observability: Logs for workflow enqueue events.

### Safety & Policy

- Action class: WRITE
- OPA rule(s) evaluated: N/A

### Dependencies

Blocks: None
Depends on: [orchestrator-core] Design and implement core workflow/runbook authoring service

### DOR / DOD

- DOR: Workflow execution enqueue API design approved.
- DOD: Code merged, tests pass, documentation updated.

### Links

- Docs: SPRINT_MAESTRO_COMPOSER_BACKEND.md
