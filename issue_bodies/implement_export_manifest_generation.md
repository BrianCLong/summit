### Context

Source: SPRINT_PROVENANCE_FIRST.md - 2) Scope (In) - Provenance & Claim Ledger v0.9
Excerpt/why: "Export manifest (hash tree + transform chain) verifiable by external script."

### Problem / Goal

Implement `GET /export/manifest/:caseId` in the `prov-ledger` service to generate a verifiable manifest (hash tree + transform chain).

### Proposed Approach

Develop an API endpoint that compiles a manifest of all relevant artifacts and their transform chains, including checksums, for a given case.

### Tasks

- [ ] Design manifest data structure (hash tree).
- [ ] Implement manifest generation logic.
- [ ] Implement `GET /export/manifest/:caseId` endpoint.

### Acceptance Criteria

- Given a `caseId`, when `GET /export/manifest/:caseId` is called, then a manifest.json is returned containing a hash tree and transform chains for all associated artifacts.
- Metrics/SLO: Manifest generation p95 latency < 500ms for cases with up to 1000 artifacts.
- Tests: Unit tests for manifest generation logic, E2E test for successful manifest export.
- Observability: Logs for manifest generation events.

### Safety & Policy

- Action class: READ
- OPA rule(s) evaluated: N/A
- Compliance: Essential for auditability and verifiable disclosure.

### Dependencies

Blocks: None
Depends on: [data-platform] Implement evidence registration in prov-ledger service

### DOR / DOD

- DOR: Export manifest design approved.
- DOD: Code merged, tests pass, documentation updated.

### Links

- Code: `prov-ledger` service
- Docs: SPRINT_PROVENANCE_FIRST.md
