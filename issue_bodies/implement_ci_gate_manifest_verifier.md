### Context

Source: SPRINT_PROVENANCE_FIRST.md - 6) Work Breakdown (By Workstream) - DevEx / SRE
Excerpt/why: "CI gates: manifest verifier"

### Problem / Goal

Integrate a CI gate to run the manifest verifier, ensuring the integrity and verifiability of disclosure bundles.

### Proposed Approach

Implement a CI/CD pipeline step that executes the CLI manifest verifier against generated disclosure bundles, failing the build if verification fails.

### Tasks

- [ ] Configure CI to generate disclosure bundles.
- [ ] Integrate CLI manifest verifier into CI/CD pipeline.
- [ ] Define failure conditions for CI gate.

### Acceptance Criteria

- Given a pull request with changes affecting disclosure bundles, when the CI gate runs, then it executes the manifest verifier and fails the build on verification failures.
- Metrics/SLO: CI gate completes within 5 minutes.
- Tests: CI gate runs.
- Observability: CI pipeline logs show manifest verification results.

### Safety & Policy

- Action class: DEPLOY
- OPA rule(s) evaluated: N/A
- Compliance: Ensures compliance with auditability and disclosure requirements.

### Dependencies

Blocks: None
Depends on: [ci-cd] Develop CLI verifier for export manifests, [data-platform] Implement disclosure bundle generation (ZIP)

### DOR / DOD

- DOR: CI gate for manifest verifier design approved.
- DOD: CI gate implemented, documentation updated.

### Links

- Docs: SPRINT_PROVENANCE_FIRST.md
