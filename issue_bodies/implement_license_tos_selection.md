### Context

Source: SPRINT_PROVENANCE_FIRST.md - 2) Scope (In) - Ingest Wizard v0.9 (MVP)
Excerpt/why: "license/TOS selection"

### Problem / Goal

Allow users to select and record license and Terms of Service for ingested data within the Ingest Wizard.

### Proposed Approach

Add UI elements for license/TOS selection and integrate storage of this metadata with the ingested data's provenance.

### Tasks

- [ ] Design UI for license/TOS selection.
- [ ] Implement frontend selection logic.
- [ ] Implement backend storage for license/TOS metadata.

### Acceptance Criteria

- Given a user completes data mapping, when they commit the ingest, then the selected license/TOS is recorded and associated with the ingested data.
- Metrics/SLO: License/TOS recording completes with ingest commit.
- Tests: Unit tests for selection and storage, E2E test for successful recording.
- Observability: Logs for license/TOS recording events.

### Safety & Policy

- Action class: WRITE
- OPA rule(s) evaluated: N/A
- Compliance: Legal and ethical requirements for data usage and attribution.

### Dependencies

Blocks: None
Depends on: [data-platform] Implement CSV/JSON upload for Ingest Wizard

### DOR / DOD

- DOR: License/TOS selection and storage design approved.
- DOD: Code merged, tests pass, documentation updated.

### Links

- Docs: SPRINT_PROVENANCE_FIRST.md
