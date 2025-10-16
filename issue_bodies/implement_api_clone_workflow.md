### Context

Source: SPRINT_MAESTRO_COMPOSER_BACKEND.md - 1) Scope & Deliverables - 1.1 API Surface (v1) - Versioning & Publishing
Excerpt/why: "POST /api/workflows/:id/clone — copy to new draft."

### Problem / Goal

Develop an API endpoint (`POST /api/workflows/:id/clone`) to create a new draft by copying an existing workflow.

### Proposed Approach

Implement a REST API endpoint that takes an existing workflow ID, duplicates its definition, and creates a new workflow draft with a new ID and initial version.

### Tasks

- [ ] Define API endpoint for cloning workflows.
- [ ] Implement workflow duplication logic.
- [ ] Assign new ID and initial draft version to cloned workflow.

### Acceptance Criteria

- Given a valid workflow ID, when `POST /api/workflows/:id/clone` is called, then a new workflow draft is created as a copy of the original.
- Metrics/SLO: Workflow clone p95 latency < 200ms.
- Tests: Unit tests for cloning logic, integration tests for API endpoint.
- Observability: Logs for workflow clone events.

### Safety & Policy

- Action class: WRITE
- OPA rule(s) evaluated: N/A

### Dependencies

Blocks: None
Depends on: [orchestrator-core] Design and implement core workflow/runbook authoring service

### DOR / DOD

- DOR: Workflow clone API design approved.
- DOD: Code merged, tests pass, documentation updated.

### Links

- Docs: SPRINT_MAESTRO_COMPOSER_BACKEND.md
