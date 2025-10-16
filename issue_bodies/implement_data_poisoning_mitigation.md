### Context

Source: SPRINT_PROVENANCE_FIRST.md - 10) Risks & Mitigations
Excerpt/why: "Data poisoning: mark fixtures; tag any honeypot sources"

### Problem / Goal

Develop mechanisms to mark test fixtures and tag honeypot data sources to prevent data poisoning in production and test environments.

### Proposed Approach

Implement metadata tagging for data sources and fixtures that identifies them as non-production or honeypot data, and ensure these tags are respected by data processing pipelines.

### Tasks

- [ ] Define metadata tags for fixtures and honeypot sources.
- [ ] Implement tagging mechanism during data ingest/creation.
- [ ] Ensure data processing pipelines respect these tags.

### Acceptance Criteria

- Given a data source is a fixture or honeypot, when processed, then it is correctly identified and handled to prevent poisoning of production data or models.
- Metrics/SLO: N/A
- Tests: Unit tests for tagging and tag-respecting logic.
- Observability: Logs for data tagging events.

### Safety & Policy

- Action class: WRITE
- OPA rule(s) evaluated: N/A
- Compliance: Protects data integrity and model reliability.

### Dependencies

Blocks: None
Depends on: [data-platform] Develop streaming ETL path for ingest

### DOR / DOD

- DOR: Data poisoning mitigation strategy approved.
- DOD: Code merged, tests pass, documentation updated.

### Links

- Docs: SPRINT_PROVENANCE_FIRST.md
