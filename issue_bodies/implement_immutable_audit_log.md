### Context

Source: SPRINT_PROVENANCE_FIRST.md - 2) Scope (In) - Policy Reasoner & Audit v0.7
Excerpt/why: "immutable audit log"

### Problem / Goal

Create an immutable audit log to record who, what, why, and when for all significant actions.

### Proposed Approach

Design a database schema for audit logs that ensures immutability (e.g., append-only) and implement API endpoints for logging and querying audit events.

### Tasks

- [ ] Design audit log schema.
- [ ] Implement append-only audit log storage.
- [ ] Implement API for audit log search/retrieval.

### Acceptance Criteria

- Given a significant action occurs, when the action is completed, then an immutable record is added to the audit log detailing who, what, why, and when.
- Metrics/SLO: Audit log writes p95 latency < 50ms.
- Tests: Unit tests for immutability and logging, E2E test for audit trail integrity.
- Observability: Metrics for audit log volume and latency.

### Safety & Policy

- Action class: WRITE
- OPA rule(s) evaluated: N/A
- Compliance: Fundamental for accountability, forensics, and regulatory compliance.

### Dependencies

Blocks: None
Depends on: None

### DOR / DOD

- DOR: Immutable audit log design approved.
- DOD: Code merged, tests pass, documentation updated.

### Links

- Docs: SPRINT_PROVENANCE_FIRST.md
