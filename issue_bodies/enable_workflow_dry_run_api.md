### Context

Source: SPRINT_MAESTRO_COMPOSER_BACKEND.md - 0) North Star - Success at Sprint End
Excerpt/why: "A designer in the Composer UI can ... dry‑run ... a workflow via backend APIs."

### Problem / Goal

Implement the `POST /api/workflows/simulate` endpoint for dry-running workflows with mocked step results, returning path decisions, timing, and cost estimate.

### Proposed Approach

Develop an API endpoint that simulates workflow execution without side-effects, using mocked data for external interactions and calculating estimated metrics.

### Tasks

- [ ] Define API endpoint for workflow simulation.
- [ ] Implement workflow simulation logic with mocked step results.
- [ ] Calculate and return path decisions, timing, and cost estimates.

### Acceptance Criteria

- Given a workflow definition, when `POST /api/workflows/simulate` is called, then a dry-run simulation is performed, returning accurate path decisions, timing, and cost estimates without executing real side-effects.
- Metrics/SLO: Workflow simulation p95 latency < 300ms.
- Tests: Unit tests for simulation logic, integration tests for API endpoint.
- Observability: Logs for workflow simulation requests.

### Safety & Policy

- Action class: READ
- OPA rule(s) evaluated: N/A

### Dependencies

Blocks: None
Depends on: [orchestrator-core] Design and implement core workflow/runbook authoring service

### DOR / DOD

- DOR: Workflow dry-run API design approved.
- DOD: Code merged, tests pass, documentation updated.

### Links

- Docs: SPRINT_MAESTRO_COMPOSER_BACKEND.md
