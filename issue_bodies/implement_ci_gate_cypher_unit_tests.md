### Context

Source: SPRINT_PROVENANCE_FIRST.md - 6) Work Breakdown (By Workstream) - DevEx / SRE
Excerpt/why: "CI gates: Cypher unit tests"

### Problem / Goal

Integrate a CI gate to run Cypher unit tests, ensuring the correctness of graph queries.

### Proposed Approach

Implement a CI/CD pipeline step that executes predefined Cypher unit tests against the graph database, failing the build if tests fail.

### Tasks

- [ ] Define Cypher unit test framework/approach.
- [ ] Write initial Cypher unit tests.
- [ ] Integrate Cypher unit tests into CI/CD pipeline.

### Acceptance Criteria

- Given a pull request with Cypher changes, when the CI gate runs, then it executes Cypher unit tests and fails the build on test failures.
- Metrics/SLO: CI gate completes within 2 minutes.
- Tests: CI gate runs.
- Observability: CI pipeline logs show Cypher unit test results.

### Safety & Policy

- Action class: DEPLOY
- OPA rule(s) evaluated: N/A

### Dependencies

Blocks: None
Depends on: [orchestrator-core] Implement NL → Cypher generation

### DOR / DOD

- DOR: CI gate for Cypher unit tests design approved.
- DOD: CI gate implemented, documentation updated.

### Links

- Docs: SPRINT_PROVENANCE_FIRST.md
