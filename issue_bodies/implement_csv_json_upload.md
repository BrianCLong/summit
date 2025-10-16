### Context

Source: SPRINT_PROVENANCE_FIRST.md - 2) Scope (In) - Ingest Wizard v0.9 (MVP)
Excerpt/why: "CSV/JSON upload"

### Problem / Goal

Implement the file upload functionality for CSV and JSON data in the Ingest Wizard.

### Proposed Approach

Develop UI components and backend endpoints for file upload.

### Tasks

- [ ] Design UI for CSV/JSON upload.
- [ ] Implement frontend upload logic.
- [ ] Implement backend endpoint for file reception.

### Acceptance Criteria

- Given a user navigates to the Ingest Wizard, when they select a CSV/JSON file, then the file is successfully uploaded.
- Metrics/SLO: Upload completes within 5 seconds for files up to 10MB.
- Tests: Unit tests for upload components, E2E test for successful upload flow.
- Observability: Logs for successful and failed uploads.

### Safety & Policy

- Action class: READ
- OPA rule(s) evaluated: N/A

### Dependencies

Blocks: None
Depends on: None

### DOR / DOD

- DOR: Design document for upload flow approved.
- DOD: Code merged, tests pass, documentation updated.

### Links

- Docs: SPRINT_PROVENANCE_FIRST.md
