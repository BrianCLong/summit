### Context

Source: SPRINT_MAESTRO_COMPOSER_BACKEND.md - 1) Scope & Deliverables - 1.1 API Surface (v1) - Human‑in‑the‑Loop
Excerpt/why: "POST /api/human-tasks/:id/complete (+assign/escalate)"

### Problem / Goal

Develop an API endpoint (`POST /api/human-tasks/:id/complete`) to complete a human task, including assign/escalate functionality.

### Proposed Approach

Implement a REST API endpoint that receives a completion request for a human task, updates its status, and optionally handles assignment or escalation logic.

### Tasks

- [ ] Define API endpoint for human task completion.
- [ ] Implement task completion logic.
- [ ] Implement assign/escalate logic.

### Acceptance Criteria

- Given a human task, when `POST /api/human-tasks/:id/complete` is called, then the task is marked as complete, and assign/escalate actions are processed correctly.
- Metrics/SLO: Human task completion p95 latency < 200ms.
- Tests: Unit tests for completion logic, integration tests for API endpoint.
- Observability: Logs for human task completion events.

### Safety & Policy

- Action class: WRITE
- OPA rule(s) evaluated: N/A

### Dependencies

Blocks: None
Depends on: [orchestrator-core] Design and implement core workflow/runbook authoring service

### DOR / DOD

- DOR: Human task completion API design approved.
- DOD: Code merged, tests pass, documentation updated.

### Links

- Docs: SPRINT_MAESTRO_COMPOSER_BACKEND.md
