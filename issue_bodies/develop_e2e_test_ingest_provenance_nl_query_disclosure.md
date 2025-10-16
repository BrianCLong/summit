### Context

Source: SPRINT_PROVENANCE_FIRST.md - 7) Test Plan - E2E
Excerpt/why: "ingest → provenance → NL query → disclosure"

### Problem / Goal

Develop an end-to-end test covering the full data flow from ingest to provenance, NL query, and final disclosure.

### Proposed Approach

Create an automated E2E test script that simulates user interactions through the entire workflow, asserting correctness at each stage and verifying the final disclosure bundle.

### Tasks

- [ ] Define E2E test scenario.
- [ ] Implement E2E test script (e.g., Playwright, Cypress).
- [ ] Integrate manifest verifier into E2E test.

### Acceptance Criteria

- Given the E2E test is executed, when the full flow completes, then all assertions pass, and the final export bundle is successfully verified.
- Metrics/SLO: E2E test completes within 5 minutes.
- Tests: E2E test passes.
- Observability: E2E test results integrated into dashboards.

### Safety & Policy

- Action class: READ | WRITE
- OPA rule(s) evaluated: All policies in the flow.
- Compliance: Verifies end-to-end compliance and data integrity.

### Dependencies

Blocks: None
Depends on: [data-platform] Implement CSV/JSON upload for Ingest Wizard, [data-platform] Implement evidence registration in prov-ledger service, [orchestrator-core] Implement NL → Cypher generation, [data-platform] Implement disclosure bundle generation (ZIP)

### DOR / DOD

- DOR: E2E test scenario approved.
- DOD: Test implemented, documentation updated.

### Links

- Docs: SPRINT_PROVENANCE_FIRST.md
