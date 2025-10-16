### Context

Source: SPRINT_MAESTRO_COMPOSER_BACKEND.md - 1) Scope & Deliverables - 1.1 API Surface (v1) - Triggers
Excerpt/why: "POST /api/schedules/reconcile — ensure cron schedules registered (idempotent)."

### Problem / Goal

Develop an API endpoint (`POST /api/schedules/reconcile`) to ensure cron schedules are registered and idempotent.

### Proposed Approach

Implement a REST API endpoint that processes a list of desired cron schedules, registering new ones and updating existing ones while ensuring that repeated calls do not create duplicate entries or unintended side-effects.

### Tasks

- [ ] Define API endpoint for schedule reconciliation.
- [ ] Implement idempotent registration/update logic for cron schedules.
- [ ] Integrate with scheduler service.

### Acceptance Criteria

- Given a list of cron schedules, when `POST /api/schedules/reconcile` is called multiple times, then schedules are correctly registered/updated without duplicates.
- Metrics/SLO: Schedule reconciliation p95 latency < 200ms.
- Tests: Unit tests for idempotency logic, integration tests for API endpoint.
- Observability: Logs for schedule reconciliation events.

### Safety & Policy

- Action class: WRITE
- OPA rule(s) evaluated: N/A

### Dependencies

Blocks: None
Depends on: [scheduler] Implement API to reconcile cron schedules (POST /api/schedules/reconcile)

### DOR / DOD

- DOR: Schedule reconciliation API design approved.
- DOD: Code merged, tests pass, documentation updated.

### Links

- Docs: SPRINT_MAESTRO_COMPOSER_BACKEND.md
