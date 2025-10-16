### Context

Source: SPRINT_MAESTRO_COMPOSER_BACKEND.md - 6) Test Plan - Integration
Excerpt/why: "provenance calls mocked."

### Problem / Goal

Implement mocks for provenance service calls in integration tests to isolate testing scope and improve test performance.

### Proposed Approach

Utilize a mocking framework to intercept and simulate responses from the provenance ledger service during integration tests, avoiding actual external service calls.

### Tasks

- [ ] Select mocking framework.
- [ ] Implement mocks for `prov-ledger` API calls.
- [ ] Configure integration tests to use mocks.

### Acceptance Criteria

- Given integration tests are run, when provenance calls are made, then they are successfully mocked and do not interact with the real `prov-ledger` service.
- Metrics/SLO: Integration tests run faster with mocks.
- Tests: Integration tests pass.
- Observability: N/A

### Safety & Policy

- Action class: READ | WRITE
- OPA rule(s) evaluated: N/A

### Dependencies

Blocks: None
Depends on: [data-platform] Ensure prov-ledger API is reachable

### DOR / DOD

- DOR: Provenance mocking strategy approved.
- DOD: Mocks implemented, tests pass, documentation updated.

### Links

- Docs: SPRINT_MAESTRO_COMPOSER_BACKEND.md
