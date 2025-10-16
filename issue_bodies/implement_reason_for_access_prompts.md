### Context

Source: SPRINT_PROVENANCE_FIRST.md - 2) Scope (In) - Policy Reasoner & Audit v0.7
Excerpt/why: "reason‑for‑access prompts"

### Problem / Goal

Display a modal prompting for reason-for-access when sensitive fields are accessed, and integrate this with the audit log.

### Proposed Approach

Develop a frontend modal that triggers on sensitive data access, captures user-provided reasons, and passes them to the backend for audit logging.

### Tasks

- [ ] Identify sensitive fields/actions requiring reason-for-access.
- [ ] Design and implement reason-for-access modal UI.
- [ ] Integrate modal with backend audit logging.

### Acceptance Criteria

- Given a user attempts to access a protected field, when the action is initiated, then a reason-for-access modal is displayed and the provided reason is stored in the audit log.
- Metrics/SLO: Reason-for-access modal display p95 latency < 200ms.
- Tests: Unit tests for modal logic, E2E test for modal display and audit logging.
- Observability: Logs for reason-for-access events.

### Safety & Policy

- Action class: READ
- OPA rule(s) evaluated: N/A
- Compliance: Supports auditability and accountability for sensitive data access.

### Dependencies

Blocks: None
Depends on: [audit-telemetry] Implement immutable audit log

### DOR / DOD

- DOR: Reason-for-access design approved.
- DOD: Code merged, tests pass, documentation updated.

### Links

- Docs: SPRINT_PROVENANCE_FIRST.md
