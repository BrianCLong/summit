### Context

Source: SPRINT_PROVENANCE_FIRST.md - 4) Deliverables
Excerpt/why: "CLI verifier to validate export manifests offline."

### Problem / Goal

Develop an external CLI script to validate export manifests offline, ensuring their integrity and verifiability.

### Proposed Approach

Create a standalone command-line tool that takes a manifest.json and associated artifacts, re-computes hashes, and verifies the transform chain.

### Tasks

- [ ] Design CLI command structure.
- [ ] Implement hash re-computation and verification logic.
- [ ] Implement transform chain verification.

### Acceptance Criteria

- Given a valid export bundle and manifest, when the CLI verifier is run, then it returns PASS.
- Metrics/SLO: Verification completes within 10 seconds for typical bundles.
- Tests: Unit tests for verification logic, E2E test for successful verification against golden bundles.
- Observability: N/A

### Safety & Policy

- Action class: READ
- OPA rule(s) evaluated: N/A
- Compliance: Crucial for external audit and trust in disclosures.

### Dependencies

Blocks: None
Depends on: [data-platform] Implement export manifest generation in prov-ledger service

### DOR / DOD

- DOR: CLI verifier design approved.
- DOD: Code merged, tests pass, documentation updated.

### Links

- Docs: SPRINT_PROVENANCE_FIRST.md
