### Context

Source: SPRINT_MAESTRO_COMPOSER_BACKEND.md - 6) Test Plan - Unit
Excerpt/why: "compiler/validator"

### Problem / Goal

Develop unit tests for the workflow DAG compiler and validator.

### Proposed Approach

Write unit tests that provide various workflow definitions (valid, invalid, edge cases) and assert that the compiler produces correct DAGs and the validator correctly identifies issues.

### Tasks

- [ ] Define test cases for compiler/validator.
- [ ] Write unit tests for DAG compilation logic.
- [ ] Write unit tests for validation rules.

### Acceptance Criteria

- Given a workflow definition, when unit tests are run, then the compiler produces correct DAGs and the validator correctly identifies issues.
- Metrics/SLO: Unit tests complete within 200ms.
- Tests: Unit tests pass.
- Observability: N/A

### Safety & Policy

- Action class: READ
- OPA rule(s) evaluated: N/A

### Dependencies

Blocks: None
Depends on: [orchestrator-core] Implement DAG compiler for workflow definitions

### DOR / DOD

- DOR: Compiler/validator unit test strategy approved.
- DOD: Tests implemented, documentation updated.

### Links

- Docs: SPRINT_MAESTRO_COMPOSER_BACKEND.md
