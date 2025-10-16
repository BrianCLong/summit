### Context

Source: SPRINT_PROVENANCE_FIRST.md - 6) Work Breakdown (By Workstream) - DevEx / SRE
Excerpt/why: "k6 smoke for read queries"

### Problem / Goal

Develop k6 scripts to perform smoke tests on read queries, ensuring basic functionality and performance under light load.

### Proposed Approach

Write k6 test scripts that simulate typical read query patterns and execute them against the deployed system, reporting on success rates and basic latency.

### Tasks

- [ ] Install and configure k6.
- [ ] Write k6 script for typical read queries.
- [ ] Integrate k6 tests into CI/CD pipeline.

### Acceptance Criteria

- Given a deployment, when k6 smoke tests are run, then all read queries succeed with acceptable latency.
- Metrics/SLO: k6 smoke tests pass with 100% success rate and p95 latency < 1.0s.
- Tests: k6 test runs.
- Observability: k6 test results integrated into dashboards.

### Safety & Policy

- Action class: READ
- OPA rule(s) evaluated: N/A

### Dependencies

Blocks: None
Depends on: None

### DOR / DOD

- DOR: k6 smoke test strategy approved.
- DOD: Scripts created, tests run, documentation updated.

### Links

- Docs: SPRINT_PROVENANCE_FIRST.md
