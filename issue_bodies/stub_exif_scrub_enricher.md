### Context

Source: SPRINT_PROVENANCE_FIRST.md - 2) Scope (In) - Ingest Wizard v0.9 (MVP)
Excerpt/why: "enrichers stubbed: EXIF scrub"

### Problem / Goal

Create a stub for EXIF scrub enrichment in the streaming ETL path.

### Proposed Approach

Implement a placeholder module that simulates EXIF data scrubbing and adds dummy scrubbed indicators to records in the streaming pipeline.

### Tasks

- [ ] Define EXIF scrub enrichment interface.
- [ ] Implement EXIF scrub enricher stub.
- [ ] Integrate stub into streaming ETL path.

### Acceptance Criteria

- Given data with EXIF content flows through the ETL, when the EXIF scrub enricher stub is active, then dummy scrubbed indicators are added to the records.
- Metrics/SLO: EXIF scrub enricher stub adds no more than 10ms latency per record.
- Tests: Unit tests for stub functionality.
- Observability: Logs for enricher stub activity.

### Safety & Policy

- Action class: READ
- OPA rule(s) evaluated: N/A

### Dependencies

Blocks: None
Depends on: [data-platform] Develop streaming ETL path for ingest

### DOR / DOD

- DOR: Enricher stub design approved.
- DOD: Code merged, tests pass, documentation updated.

### Links

- Docs: SPRINT_PROVENANCE_FIRST.md
