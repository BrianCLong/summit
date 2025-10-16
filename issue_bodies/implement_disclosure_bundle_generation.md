### Context

Source: SPRINT_PROVENANCE_FIRST.md - 2) Scope (In) - Report/Disclosure Pack v0.4
Excerpt/why: "Disclosure bundle includes export manifest."

### Problem / Goal

Create a ZIP bundle for disclosure, including the report, figures, manifest.json, and license.txt, ensuring verifiability.

### Proposed Approach

Develop a bundling service that collects all required disclosure artifacts, zips them, and includes the verifiable manifest and license summary.

### Tasks

- [ ] Define disclosure bundle structure (ZIP).
- [ ] Implement artifact collection and zipping logic.
- [ ] Integrate manifest.json and license.txt into the bundle.

### Acceptance Criteria

- Given a case, when a disclosure bundle is generated, then it contains the report, figures, manifest.json, license.txt, and passes external verification.
- Metrics/SLO: Disclosure bundle generation p95 latency < 5 seconds.
- Tests: Unit tests for bundling logic, E2E test for bundle integrity and verifiability.
- Observability: Logs for bundle generation events.

### Safety & Policy

- Action class: READ
- OPA rule(s) evaluated: N/A
- Compliance: Critical for legal and regulatory compliance, and external audit.

### Dependencies

Blocks: None
Depends on: [data-platform] Implement export manifest generation in prov-ledger service, [frontend] Implement evidence-first brief generation, [policy] Enforce license at export

### DOR / DOD

- DOR: Disclosure bundle design approved.
- DOD: Code merged, tests pass, documentation updated.

### Links

- Docs: SPRINT_PROVENANCE_FIRST.md
