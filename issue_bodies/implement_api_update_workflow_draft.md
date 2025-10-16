### Context

Source: SPRINT_MAESTRO_COMPOSER_BACKEND.md - 1) Scope & Deliverables - 1.1 API Surface (v1) - Workflow CRUD
Excerpt/why: "PUT /api/workflows/:id — update draft; server validates against JSON Schema."

### Problem / Goal

Develop an API endpoint (`PUT /api/workflows/:id`) to update a workflow draft, with server-side JSON Schema validation.

### Proposed Approach

Implement a REST API endpoint that accepts updates to a workflow draft, applies the changes, and validates the updated definition against its JSON Schema before persisting.

### Tasks

- [ ] Define API endpoint for updating workflow drafts.
- [ ] Implement update logic for workflow drafts.
- [ ] Integrate JSON Schema validation for incoming payloads.

### Acceptance Criteria

- Given a valid workflow draft update payload, when `PUT /api/workflows/:id` is called, then the draft is updated and successfully validated against its JSON Schema.
- Metrics/SLO: Workflow draft update p95 latency < 200ms.
- Tests: Unit tests for update logic and JSON Schema validation, integration tests for API endpoint.
- Observability: Logs for workflow draft update events.

### Safety & Policy

- Action class: WRITE
- OPA rule(s) evaluated: N/A

### Dependencies

Blocks: None
Depends on: [orchestrator-core] Design and implement core workflow/runbook authoring service, [orchestrator-core] Author JSON Schema for WorkflowDefinition

### DOR / DOD

- DOR: Workflow draft update API design approved.
- DOD: Code merged, tests pass, documentation updated.

### Links

- Docs: SPRINT_MAESTRO_COMPOSER_BACKEND.md
