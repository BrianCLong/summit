### Context

Source: SPRINT_MAESTRO_COMPOSER_BACKEND.md - 6) Test Plan - E2E
Excerpt/why: "sample workflows (routing, RAG, approval) from template → publish → simulate → execute."

### Problem / Goal

Create end-to-end tests that cover sample workflows from template creation to publishing, simulation, and execution.

### Proposed Approach

Develop automated E2E test scripts that simulate the full lifecycle of various sample workflows (e.g., routing, RAG, approval), asserting correctness at each stage.

### Tasks

- [ ] Define E2E test scenarios for sample workflows.
- [ ] Implement E2E test scripts for each scenario.
- [ ] Integrate tests into CI/CD pipeline.

### Acceptance Criteria

- Given the E2E tests are executed, when sample workflows are processed, then they successfully complete their lifecycle from template to execution.
- Metrics/SLO: E2E tests complete within 10 minutes.
- Tests: E2E tests pass.
- Observability: E2E test results visible in CI/CD pipeline.

### Safety & Policy

- Action class: READ | WRITE
- OPA rule(s) evaluated: N/A

### Dependencies

Blocks: None
Depends on: [orchestrator-core] Enable workflow creation via backend APIs, [orchestrator-core] Enable workflow publishing via backend APIs, [orchestrator-core] Enable workflow dry-run via backend APIs, [orchestrator-core] Enable workflow execution via backend APIs

### DOR / DOD

- DOR: Sample workflow E2E test strategy approved.
- DOD: Tests implemented, documentation updated.

### Links

- Docs: SPRINT_MAESTRO_COMPOSER_BACKEND.md
