### Context

Source: SPRINT_MAESTRO_COMPOSER_BACKEND.md - 0) North Star
Excerpt/why: "A designer in the Composer UI can ... validate ... a workflow via backend APIs."

### Problem / Goal

Develop `POST /api/workflows/validate` for DAG compile, including checks for cycles, unreachable steps, type errors, and linting for timeouts/retries.

### Proposed Approach

Implement a validation service that parses workflow definitions, builds a DAG, and performs static analysis to identify common errors and adherence to best practices.

### Tasks

- [ ] Define API endpoint `POST /api/workflows/validate`.
- [ ] Implement DAG parsing and validation logic.
- [ ] Implement checks for cycles, unreachable steps, type errors, timeouts, and retries.

### Acceptance Criteria

- Given an invalid workflow definition, when `POST /api/workflows/validate` is called, then the API returns actionable errors indicating the validation failures.
- Metrics/SLO: Workflow validation p95 latency < 200ms.
- Tests: Unit tests for validation logic, integration tests for API endpoint.
- Observability: Logs for validation requests and errors.

### Safety & Policy

- Action class: READ
- OPA rule(s) evaluated: N/A

### Dependencies

Blocks: None
Depends on: [orchestrator-core] Implement core backend for Maestro Composer

### DOR / DOD

- DOR: Workflow validation API design approved.
- DOD: API implemented, tested, and documented.

### Links

- Docs: SPRINT_MAESTRO_COMPOSER_BACKEND.md
