### Context

Source: SPRINT_MAESTRO_COMPOSER_BACKEND.md - 1) Scope & Deliverables - 1.1 API Surface (v1)
Excerpt/why: "OpenAPI v3 must be generated & published (swagger.json + Redoc page)."

### Problem / Goal

Automate the generation and publishing of the OpenAPI v3 specification (swagger.json + Redoc page) for the Maestro Composer backend APIs.

### Proposed Approach

Integrate an OpenAPI generation tool into the build process that automatically creates the swagger.json and Redoc HTML documentation from API annotations or code structure, and publishes them to a static hosting location.

### Tasks

- [ ] Select OpenAPI generation tool.
- [ ] Configure API annotations/code for OpenAPI generation.
- [ ] Implement CI/CD step for generation and publishing.

### Acceptance Criteria

- Given a new API deployment, when the CI/CD pipeline runs, then the OpenAPI v3 specification (swagger.json + Redoc page) is generated and published to the designated location.
- Metrics/SLO: OpenAPI generation and publishing completes within 2 minutes.
- Tests: CI/CD pipeline tests for OpenAPI generation.
- Observability: Logs for OpenAPI generation and publishing events.

### Safety & Policy

- Action class: DEPLOY
- OPA rule(s) evaluated: N/A

### Dependencies

Blocks: None
Depends on: [orchestrator-core] Design and implement core workflow/runbook authoring service

### DOR / DOD

- DOR: OpenAPI generation strategy approved.
- DOD: Automation implemented, documentation published.

### Links

- Docs: SPRINT_MAESTRO_COMPOSER_BACKEND.md
