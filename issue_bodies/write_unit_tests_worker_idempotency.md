### Context

Source: SPRINT_MAESTRO_COMPOSER_BACKEND.md - 6) Test Plan - Unit
Excerpt/why: "worker idempotency"

### Problem / Goal

Develop unit tests to verify the idempotency of worker handlers, ensuring exactly-once processing of tasks.

### Proposed Approach

Write unit tests that simulate duplicate task processing for worker handlers and assert that critical side-effects are only performed once.

### Tasks

- [ ] Define test cases for worker idempotency.
- [ ] Write unit tests for idempotent worker handlers.
- [ ] Test various failure and retry scenarios.

### Acceptance Criteria

- Given a worker handler is invoked multiple times with the same idempotency key, when unit tests are run, then critical side-effects occur exactly once.
- Metrics/SLO: Unit tests complete within 200ms.
- Tests: Unit tests pass.
- Observability: N/A

### Safety & Policy

- Action class: WRITE
- OPA rule(s) evaluated: N/A

### Dependencies

Blocks: None
Depends on: [orchestrator-core] Ensure workflow executions are idempotent

### DOR / DOD

- DOR: Worker idempotency unit test strategy approved.
- DOD: Tests implemented, documentation updated.

### Links

- Docs: SPRINT_MAESTRO_COMPOSER_BACKEND.md
