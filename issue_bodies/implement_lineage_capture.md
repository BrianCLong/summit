### Context

Source: SPRINT_PROVENANCE_FIRST.md - 2) Scope (In) - Ingest Wizard v0.9 (MVP)
Excerpt/why: "lineage capture"

### Problem / Goal

Capture and store lineage information for each field during data ingest in the Ingest Wizard.

### Proposed Approach

Extend the ingest process to track the origin and transformations of each data field, storing this as part of the data's metadata.

### Tasks

- [ ] Define lineage data model.
- [ ] Implement lineage tracking during ingest.
- [ ] Persist lineage information with ingested data.

### Acceptance Criteria

- Given data is ingested, when inspecting any field, then its lineage (source, transformations) is accurately captured and retrievable.
- Metrics/SLO: Lineage capture adds no more than 5% overhead to ingest time.
- Tests: Unit tests for lineage tracking, E2E test for lineage integrity.
- Observability: Logs for lineage capture events.

### Safety & Policy

- Action class: WRITE
- OPA rule(s) evaluated: N/A

### Dependencies

Blocks: None
Depends on: [data-platform] Implement CSV/JSON upload for Ingest Wizard

### DOR / DOD

- DOR: Lineage capture design approved.
- DOD: Code merged, tests pass, documentation updated.

### Links

- Docs: SPRINT_PROVENANCE_FIRST.md
