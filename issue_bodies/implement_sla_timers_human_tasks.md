### Context

Source: SPRINT_MAESTRO_COMPOSER_BACKEND.md - 2) Epics → Stories → Acceptance Criteria - Epic B — Execution Runtime
Excerpt/why: "Human Task State Machine (3 pt) — assign/escalate/complete; SLA timers."

### Problem / Goal

Add SLA timers to human tasks and trigger events on SLA breaches.

### Proposed Approach

Extend the human task state machine to include configurable SLA durations, and implement a monitoring component that detects breaches and emits corresponding events (e.g., for escalation policies).

### Tasks

- [ ] Define SLA configuration for human tasks.
- [ ] Implement SLA timer tracking.
- [ ] Implement SLA breach detection and event emission.

### Acceptance Criteria

- Given a human task with an SLA, when the SLA is breached, then an SLA breach event is emitted and an escalation policy is triggered.
- Metrics/SLO: SLA breach detection p95 latency < 100ms.
- Tests: Unit tests for SLA logic, integration tests for event emission.
- Observability: Logs for SLA breach events.

### Safety & Policy

- Action class: READ
- OPA rule(s) evaluated: N/A

### Dependencies

Blocks: None
Depends on: [orchestrator-core] Implement API to complete a human task (POST /api/human-tasks/:id/complete)

### DOR / DOD

- DOR: SLA timer design approved.
- DOD: Code merged, tests pass, documentation updated.

### Links

- Docs: SPRINT_MAESTRO_COMPOSER_BACKEND.md
