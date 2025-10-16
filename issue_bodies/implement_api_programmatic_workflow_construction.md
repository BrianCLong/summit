### Context

Source: SPRINT_MAESTRO_COMPOSER_BACKEND.md - 1) Scope & Deliverables - 1.1 API Surface (v1) - Templates & Builder
Excerpt/why: "POST /api/workflow-builder — programmatic construction for common patterns (routing, RAG, ETL, approvals)."

### Problem / Goal

Develop an API endpoint (`POST /api/workflow-builder`) for programmatically building workflows based on common patterns (routing, RAG, ETL, approvals).

### Proposed Approach

Implement a REST API endpoint that accepts a high-level description of a common workflow pattern and programmatically constructs the detailed workflow definition, returning it as a draft.

### Tasks

- [ ] Define API endpoint for programmatic builder.
- [ ] Implement logic for common workflow pattern construction.
- [ ] Return constructed workflow definition as draft.

### Acceptance Criteria

- Given a request for a common pattern, when `POST /api/workflow-builder` is called, then a workflow definition matching the pattern is programmatically constructed and returned as a draft.
- Metrics/SLO: Programmatic construction p95 latency < 500ms.
- Tests: Unit tests for pattern construction logic, integration tests for API endpoint.
- Observability: Logs for programmatic workflow construction events.

### Safety & Policy

- Action class: WRITE
- OPA rule(s) evaluated: N/A

### Dependencies

Blocks: None
Depends on: [orchestrator-core] Design and implement core workflow/runbook authoring service

### DOR / DOD

- DOR: Programmatic workflow builder API design approved.
- DOD: Code merged, tests pass, documentation updated.

### Links

- Docs: SPRINT_MAESTRO_COMPOSER_BACKEND.md
