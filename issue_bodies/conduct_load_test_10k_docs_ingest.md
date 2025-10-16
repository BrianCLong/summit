### Context

Source: SPRINT_PROVENANCE_FIRST.md - 7) Test Plan - Load
Excerpt/why: "10k docs in ≤5 minutes"

### Problem / Goal

Perform load testing to ensure 10,000 documents can be ingested within 5 minutes.

### Proposed Approach

Develop a load test script (e.g., using k6, JMeter) that simulates concurrent ingestion of 10,000 documents and measures the total time taken.

### Tasks

- [ ] Develop load test script for ingest.
- [ ] Configure test environment for load testing.
- [ ] Execute load test and collect metrics.

### Acceptance Criteria

- Given the load test is executed, when 10,000 documents are ingested, then the total ingestion time is ≤5 minutes.
- Metrics/SLO: 10k docs ingested in ≤5 minutes.
- Tests: Load test passes.
- Observability: Load test results integrated into dashboards.

### Safety & Policy

- Action class: READ | WRITE
- OPA rule(s) evaluated: N/A

### Dependencies

Blocks: None
Depends on: [data-platform] Develop streaming ETL path for ingest

### DOR / DOD

- DOR: Load test plan approved.
- DOD: Load test implemented, documentation updated.

### Links

- Docs: SPRINT_PROVENANCE_FIRST.md
