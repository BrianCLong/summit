### Context

Source: SPRINT_PROVENANCE_FIRST.md - 6) Work Breakdown (By Workstream) - Security & Governance
Excerpt/why: "enforcement at export"

### Problem / Goal

Prevent data export if licensing requirements are not met, ensuring legal compliance.

### Proposed Approach

Integrate license checks into the data export pipeline, blocking exports that lack required license metadata or violate license terms.

### Tasks

- [ ] Define license enforcement rules for export.
- [ ] Implement license check in export process.
- [ ] Develop error handling for blocked exports.

### Acceptance Criteria

- Given an export request, when licensing requirements are not met, then the export is blocked and a clear reason is provided.
- Metrics/SLO: License enforcement adds no more than 10% overhead to export latency.
- Tests: Unit tests for enforcement logic, E2E test for blocked exports.
- Observability: Logs for blocked export events.

### Safety & Policy

- Action class: READ
- OPA rule(s) evaluated: N/A
- Compliance: Prevents illegal data distribution and ensures adherence to licensing agreements.

### Dependencies

Blocks: None
Depends on: [policy] Implement license registry, [data-platform] Implement disclosure bundle generation (ZIP)

### DOR / DOD

- DOR: License enforcement design approved.
- DOD: Code merged, tests pass, documentation updated.

### Links

- Docs: SPRINT_PROVENANCE_FIRST.md
