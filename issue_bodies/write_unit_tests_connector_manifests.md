### Context

Source: SPRINT_PROVENANCE_FIRST.md - 7) Test Plan - Unit
Excerpt/why: "connector manifests"

### Problem / Goal

Develop unit tests to validate connector manifests, ensuring their correctness and adherence to specifications.

### Proposed Approach

Write unit tests that parse connector manifest files and assert their structure, required fields, and data types.

### Tasks

- [ ] Define unit test framework for manifests.
- [ ] Write test cases for valid manifests.
- [ ] Write test cases for invalid manifests.

### Acceptance Criteria

- Given a connector manifest, when unit tests are run, then they pass for valid manifests and fail for invalid ones.
- Metrics/SLO: Unit tests complete within 100ms.
- Tests: Unit tests pass.
- Observability: N/A

### Safety & Policy

- Action class: READ
- OPA rule(s) evaluated: N/A

### Dependencies

Blocks: None
Depends on: None

### DOR / DOD

- DOR: Unit test strategy for connector manifests approved.
- DOD: Tests implemented, documentation updated.

### Links

- Docs: SPRINT_PROVENANCE_FIRST.md
