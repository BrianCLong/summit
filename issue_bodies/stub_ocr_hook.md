### Context

Source: SPRINT_PROVENANCE_FIRST.md - 2) Scope (In) - Ingest Wizard v0.9 (MVP)
Excerpt/why: "enrichers stubbed: OCR hook"

### Problem / Goal

Create a stub for OCR hook in the streaming ETL path.

### Proposed Approach

Implement a placeholder module that simulates OCR processing and adds dummy OCR results to records in the streaming pipeline.

### Tasks

- [ ] Define OCR hook interface.
- [ ] Implement OCR hook stub.
- [ ] Integrate stub into streaming ETL path.

### Acceptance Criteria

- Given data with image content flows through the ETL, when the OCR hook stub is active, then dummy OCR results are added to the records.
- Metrics/SLO: OCR hook stub adds no more than 10ms latency per record.
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
