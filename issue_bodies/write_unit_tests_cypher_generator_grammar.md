### Context

Source: SPRINT_PROVENANCE_FIRST.md - 7) Test Plan - Unit
Excerpt/why: "Cypher generator grammar"

### Problem / Goal

Develop unit tests to validate the grammar used by the Cypher generator, ensuring syntactical correctness and coverage.

### Proposed Approach

Write unit tests that provide various natural language inputs and assert that the generated Cypher adheres to the defined grammar rules and produces expected structures.

### Tasks

- [ ] Define test cases for Cypher grammar rules.
- [ ] Write unit tests for Cypher generation logic.
- [ ] Integrate tests into CI/CD.

### Acceptance Criteria

- Given a natural language input, when unit tests are run, then the generated Cypher is syntactically correct and adheres to grammar rules.
- Metrics/SLO: Unit tests complete within 200ms.
- Tests: Unit tests pass.
- Observability: N/A

### Safety & Policy

- Action class: READ
- OPA rule(s) evaluated: N/A

### Dependencies

Blocks: None
Depends on: [orchestrator-core] Implement NL → Cypher generation

### DOR / DOD

- DOR: Unit test strategy for Cypher generator grammar approved.
- DOD: Tests implemented, documentation updated.

### Links

- Docs: SPRINT_PROVENANCE_FIRST.md
