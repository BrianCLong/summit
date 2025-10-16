### Context

Source: SPRINT_PROVENANCE_FIRST.md - 2) Scope (In) - Ingest Wizard v0.9 (MVP)
Excerpt/why: "schema mapping with AI suggestions"

### Problem / Goal

Develop AI suggestions for mapping uploaded data schemas to canonical entities in the Ingest Wizard.

### Proposed Approach

Integrate an AI model (stub initially) to analyze uploaded schema and suggest mappings to predefined canonical entities.

### Tasks

- [ ] Define canonical entity schema for mapping.
- [ ] Implement AI suggestion logic (stub).
- [ ] Integrate AI suggestions into the mapping UI.

### Acceptance Criteria

- Given a user uploads a file, when they proceed to schema mapping, then AI suggestions are provided for field mapping.
- Metrics/SLO: AI suggestions appear within 2 seconds.
- Tests: Unit tests for mapping logic, E2E test for suggestion display.
- Observability: Logs for AI suggestion requests and responses.

### Safety & Policy

- Action class: READ
- OPA rule(s) evaluated: N/A

### Dependencies

Blocks: None
Depends on: [data-platform] Implement CSV/JSON upload for Ingest Wizard

### DOR / DOD

- DOR: AI suggestion model and integration plan approved.
- DOD: Code merged, tests pass, documentation updated.

### Links

- Docs: SPRINT_PROVENANCE_FIRST.md
