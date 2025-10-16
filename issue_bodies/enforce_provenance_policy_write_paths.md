### Context

Source: SPRINT_PROVENANCE_FIRST.md - 6) Work Breakdown (By Workstream) - Graph / DB
Excerpt/why: "Write‑paths enforce provenance and policy tags"

### Problem / Goal

Ensure all data write operations automatically enforce and apply provenance and policy tags.

### Proposed Approach

Modify all data ingestion and modification pathways to include mandatory fields for provenance (e.g., source, transform chain) and policy tags (e.g., sensitivity, legal basis), integrating with the policy engine.

### Tasks

- [ ] Identify all write-paths in the system.
- [ ] Implement mandatory provenance field population.
- [ ] Integrate policy tag enforcement on write operations.

### Acceptance Criteria

- Given a write operation is performed, when the data is persisted, then it automatically includes correct provenance and policy tags, and operations failing to meet policy are blocked.
- Metrics/SLO: Provenance/policy enforcement adds no more than 10% overhead to write latency.
- Tests: Unit tests for write-path enforcement, E2E test for policy tag integrity.
- Observability: Logs for policy enforcement actions.

### Safety & Policy

- Action class: WRITE
- OPA rule(s) evaluated: All relevant provenance and policy tag rules.
- Compliance: Ensures data integrity, auditability, and adherence to governance policies.

### Dependencies

Blocks: None
Depends on: [data-platform] Implement evidence registration in prov-ledger service, [policy] Implement ABAC/OPA policies for policy-gateway

### DOR / DOD

- DOR: Write-path enforcement design approved.
- DOD: Code merged, tests pass, documentation updated.

### Links

- Docs: SPRINT_PROVENANCE_FIRST.md
