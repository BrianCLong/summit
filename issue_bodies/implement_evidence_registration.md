### Context

Source: SPRINT_PROVENANCE_FIRST.md - 2) Scope (In) - Provenance & Claim Ledger v0.9
Excerpt/why: "Evidence registration (source → transform chain), checksums"

### Problem / Goal

Implement `POST /evidence/register` endpoint in the `prov-ledger` service to record source, transform chain, and checksums for evidence.

### Proposed Approach

Develop the API endpoint and database logic to persist evidence registration details, ensuring immutability and traceability.

### Tasks

- [ ] Design `evidence` table schema.
- [ ] Implement `POST /evidence/register` endpoint.
- [ ] Integrate checksum generation and storage.

### Acceptance Criteria

- Given a valid payload (source, transform, checksum, licenseRef), when `POST /evidence/register` is called, then evidence is successfully registered and persisted.
- Metrics/SLO: Evidence registration p95 latency < 100ms.
- Tests: Unit tests for API endpoint and data persistence, E2E test for successful registration.
- Observability: Logs for evidence registration events.

### Safety & Policy

- Action class: WRITE
- OPA rule(s) evaluated: N/A
- Compliance: Ensures data provenance and auditability.

### Dependencies

Blocks: None
Depends on: None

### DOR / DOD

- DOR: Evidence registration API design approved.
- DOD: Code merged, tests pass, documentation updated.

### Links

- Code: `prov-ledger` service
- Docs: SPRINT_PROVENANCE_FIRST.md
