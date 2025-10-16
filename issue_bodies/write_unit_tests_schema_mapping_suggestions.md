### Context

Source: SPRINT_PROVENANCE_FIRST.md - 7) Test Plan - Unit
Excerpt/why: "schema mapping suggestions"

### Problem / Goal

Develop unit tests to validate AI-driven schema mapping suggestions, ensuring their accuracy and reliability.

### Proposed Approach

Write unit tests that provide sample input schemas and expected canonical mappings, asserting that the AI suggestion logic produces the correct suggestions.

### Tasks

- [ ] Define test cases for schema mapping suggestions.
- [ ] Write unit tests for AI suggestion logic.
- [ ] Integrate tests into CI/CD.

### Acceptance Criteria

- Given a sample input schema, when unit tests are run, then AI mapping suggestions match expected canonical mappings.
- Metrics/SLO: Unit tests complete within 200ms.
- Tests: Unit tests pass.
- Observability: N/A

### Safety & Policy

- Action class: READ
- OPA rule(s) evaluated: N/A

### Dependencies

Blocks: None
Depends on: [data-platform] Implement schema mapping with AI suggestions for Ingest Wizard

### DOR / DOD

- DOR: Unit test strategy for schema mapping suggestions approved.
- DOD: Tests implemented, documentation updated.

### Links

- Docs: SPRINT_PROVENANCE_FIRST.md
