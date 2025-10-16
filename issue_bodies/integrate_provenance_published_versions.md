### Context

Source: SPRINT_MAESTRO_COMPOSER_BACKEND.md - 1) Scope & Deliverables - 1.4 Governance, AuthZ, Audit
Excerpt/why: "Provenance integration with `prov-ledger`: register (a) published versions (hash manifest)"

### Problem / Goal

Register published workflow versions as hash manifests in the `prov-ledger`.

### Proposed Approach

Modify the workflow publishing process to generate a hash manifest of the published workflow definition and send it to the `prov-ledger` service for immutable storage.

### Tasks

- [ ] Implement hash manifest generation for published workflows.
- [ ] Integrate with `prov-ledger` API to register manifests.
- [ ] Ensure manifest includes all relevant versioning metadata.

### Acceptance Criteria

- Given a workflow is published, when the process completes, then its hash manifest is successfully registered in the `prov-ledger`.
- Metrics/SLO: Provenance registration adds no more than 50ms to publishing latency.
- Tests: Unit tests for manifest generation, integration tests for `prov-ledger` integration.
- Observability: Logs for provenance registration events.

### Safety & Policy

- Action class: WRITE
- OPA rule(s) evaluated: N/A
- Compliance: Ensures auditability and traceability of workflow versions.

### Dependencies

Blocks: None
Depends on: [data-platform] Implement export manifest generation in prov-ledger service

### DOR / DOD

- DOR: Provenance integration for published versions design approved.
- DOD: Code merged, tests pass, documentation updated.

### Links

- Docs: SPRINT_MAESTRO_COMPOSER_BACKEND.md
