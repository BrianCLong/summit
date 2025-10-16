### Context

Source: SPRINT_MAESTRO_COMPOSER_BACKEND.md - 6) Test Plan - Integration
Excerpt/why: "Redis/PG/Neo4j containers"

### Problem / Goal

Set up Docker containers for Redis, Postgres, and Neo4j to support integration testing of Maestro Composer.

### Proposed Approach

Create Docker Compose configurations or Kubernetes manifests to spin up isolated instances of Redis, Postgres, and Neo4j for each integration test run, ensuring a clean state.

### Tasks

- [ ] Create Docker Compose for Redis, Postgres, Neo4j.
- [ ] Configure test suite to use containerized databases.
- [ ] Implement test data seeding for containers.

### Acceptance Criteria

- Given integration tests are run, when database interactions occur, then they use dedicated, clean containerized instances of Redis, Postgres, and Neo4j.
- Metrics/SLO: Container startup time < 1 minute.
- Tests: Integration tests pass.
- Observability: Container logs visible during test runs.

### Safety & Policy

- Action class: DEPLOY
- OPA rule(s) evaluated: N/A

### Dependencies

Blocks: None
Depends on: [orchestrator-core] Design and implement core workflow/runbook authoring service

### DOR / DOD

- DOR: Containerized DB setup for integration tests approved.
- DOD: Containers configured, tests pass, documentation updated.

### Links

- Docs: SPRINT_MAESTRO_COMPOSER_BACKEND.md
