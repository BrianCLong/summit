### Context

Source: SPRINT_PROVENANCE_FIRST.md - 2) Scope (In) - Ingest Wizard v0.9 (MVP)
Excerpt/why: "PII classifier"

### Problem / Goal

Integrate a PII classifier to identify and flag sensitive information during data ingest in the Ingest Wizard.

### Proposed Approach

Utilize an existing PII classification library or service (stub initially) and integrate its output into the ingest mapping UI.

### Tasks

- [ ] Research and select PII classification approach (stub).
- [ ] Implement PII classification integration.
- [ ] Display PII flags in the Ingest Wizard UI.

### Acceptance Criteria

- Given a user uploads data containing PII, when they map the schema, then PII flags are visibly displayed next to relevant fields.
- Metrics/SLO: PII classification completes within 3 seconds for typical datasets.
- Tests: Unit tests for classifier integration, E2E test for PII flag display.
- Observability: Logs for PII detection events.

### Safety & Policy

- Action class: READ
- OPA rule(s) evaluated: N/A
- Compliance: Data privacy regulations (e.g., GDPR, CCPA) require PII identification.

### Dependencies

Blocks: None
Depends on: [data-platform] Implement CSV/JSON upload for Ingest Wizard

### DOR / DOD

- DOR: PII classification strategy approved.
- DOD: Code merged, tests pass, documentation updated.

### Links

- Docs: SPRINT_PROVENANCE_FIRST.md
