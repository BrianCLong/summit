### Context

Source: SPRINT_PROVENANCE_FIRST.md - 7) Test Plan - Load
Excerpt/why: "typical graph query p95 < 1.5s on 50k‑node neighborhood (fixture)"

### Problem / Goal

Perform load testing to ensure p95 query latency is below 1.5 seconds for a 50k-node neighborhood.

### Proposed Approach

Develop a load test script (e.g., using k6, JMeter) that simulates concurrent typical graph queries against a 50k-node fixture and measures p95 latency.

### Tasks

- [ ] Develop load test script for graph queries.
- [ ] Prepare 50k-node fixture for testing.
- [ ] Execute load test and collect metrics.

### Acceptance Criteria

- Given the load test is executed, when typical graph queries are run against a 50k-node fixture, then p95 query latency is < 1.5 seconds.
- Metrics/SLO: p95 query < 1.5s on 50k-node neighborhood.
- Tests: Load test passes.
- Observability: Load test results integrated into dashboards.

### Safety & Policy

- Action class: READ
- OPA rule(s) evaluated: N/A

### Dependencies

Blocks: None
Depends on: [orchestrator-core] Implement sandbox execution for NL → Cypher queries

### DOR / DOD

- DOR: Load test plan approved.
- DOD: Load test implemented, documentation updated.

### Links

- Docs: SPRINT_PROVENANCE_FIRST.md
