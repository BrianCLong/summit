### Context

Source: SPRINT_MAESTRO_COMPOSER_BACKEND.md - 6) Test Plan - Unit
Excerpt/why: "HMAC verifier"

### Problem / Goal

Develop unit tests for the HMAC signature verification logic.

### Proposed Approach

Write unit tests that provide valid and invalid HMAC-signed payloads and assert that the verifier correctly authenticates valid signatures and rejects invalid ones.

### Tasks

- [ ] Define test cases for HMAC verification.
- [ ] Write unit tests for HMAC verification logic.
- [ ] Test edge cases (e.g., clock skew, replay attacks).

### Acceptance Criteria

- Given an HMAC-signed payload, when unit tests are run, then valid signatures are authenticated and invalid ones are rejected.
- Metrics/SLO: Unit tests complete within 100ms.
- Tests: Unit tests pass.
- Observability: N/A

### Safety & Policy

- Action class: READ
- OPA rule(s) evaluated: N/A

### Dependencies

Blocks: None
Depends on: [orchestrator-core] Implement HMAC-signed webhooks for workflow triggers

### DOR / DOD

- DOR: HMAC verifier unit test strategy approved.
- DOD: Tests implemented, documentation updated.

### Links

- Docs: SPRINT_MAESTRO_COMPOSER_BACKEND.md
