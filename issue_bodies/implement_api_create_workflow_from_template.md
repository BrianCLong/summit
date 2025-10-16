### Context

Source: SPRINT_MAESTRO_COMPOSER_BACKEND.md - 1) Scope & Deliverables - 1.1 API Surface (v1) - Templates & Builder
Excerpt/why: "POST /api/workflow-templates/:id/create"

### Problem / Goal

Develop an API endpoint (`POST /api/workflow-templates/:id/create`) to create a new workflow instance from a template.

### Proposed Approach

Implement a REST API endpoint that takes a template ID, duplicates the template's definition, and creates a new workflow draft based on it, assigning a new ID and initial version.

### Tasks

- [ ] Define API endpoint for creating from template.
- [ ] Implement template duplication logic.
- [ ] Assign new ID and initial draft version to new workflow.

### Acceptance Criteria

- Given a valid template ID, when `POST /api/workflow-templates/:id/create` is called, then a new workflow draft is created as a copy of the template.
- Metrics/SLO: Workflow creation from template p95 latency < 250ms.
- Tests: Unit tests for template duplication, integration tests for API endpoint.
- Observability: Logs for workflow creation from template events.

### Safety & Policy

- Action class: WRITE
- OPA rule(s) evaluated: N/A

### Dependencies

Blocks: None
Depends on: [orchestrator-core] Design and implement core workflow/runbook authoring service

### DOR / DOD

- DOR: Workflow creation from template API design approved.
- DOD: Code merged, tests pass, documentation updated.

### Links

- Docs: SPRINT_MAESTRO_COMPOSER_BACKEND.md
