### Context

Source: SPRINT_PROVENANCE_FIRST.md - 7) Test Plan - Unit
Excerpt/why: "policy decisions (OPA tests)"

### Problem / Goal

Develop unit tests to validate decisions made by OPA policies, ensuring their correctness and adherence to business rules.

### Proposed Approach

Write unit tests that provide various input contexts (user attributes, resource attributes) to OPA policies and assert that the policy decisions (allow/deny, obligations) are as expected.

### Tasks

- [ ] Define test cases for OPA policy decisions.
- [ ] Write unit tests for OPA policies (Rego).
- [ ] Integrate tests into CI/CD.

### Acceptance Criteria

- Given a specific input context, when unit tests are run, then OPA policy decisions (allow/deny, obligations) match expected outcomes.
- Metrics/SLO: Unit tests complete within 100ms.
- Tests: Unit tests pass.
- Observability: N/A

### Safety & Policy

- Action class: READ
- OPA rule(s) evaluated: All relevant OPA policies.
- Compliance: Ensures correct and compliant policy enforcement.

### Dependencies

Blocks: None
Depends on: [policy] Implement ABAC/OPA policies for policy-gateway

### DOR / DOD

- DOR: Unit test strategy for OPA policy decisions approved.
- DOD: Tests implemented, documentation updated.

### Links

- Docs: SPRINT_PROVENANCE_FIRST.md
