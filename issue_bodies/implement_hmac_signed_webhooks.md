### Context

Source: SPRINT_MAESTRO_COMPOSER_BACKEND.md - 1) Scope & Deliverables - 1.1 API Surface (v1) - Triggers
Excerpt/why: "POST /api/webhooks/workflow/:workflowId/:triggerPath — HMAC‑signed webhooks; rate‑limited."

### Problem / Goal

Develop an API endpoint for HMAC-signed webhooks to trigger workflows, including rate limiting.

### Proposed Approach

Implement a REST API endpoint that validates incoming webhook requests using HMAC signatures, applies rate limits based on source or tenant, and then enqueues the corresponding workflow execution.

### Tasks

- [ ] Define API endpoint for webhooks.
- [ ] Implement HMAC signature verification.
- [ ] Implement rate limiting logic.
- [ ] Enqueue workflow execution upon valid trigger.

### Acceptance Criteria

- Given a valid HMAC-signed webhook request, when `POST /api/webhooks/workflow/:workflowId/:triggerPath` is called, then the workflow is triggered and rate limits are enforced.
- Metrics/SLO: Webhook processing p95 latency < 100ms.
- Tests: Unit tests for HMAC verification and rate limiting, integration tests for API endpoint.
- Observability: Logs for webhook trigger events and rate limit violations.

### Safety & Policy

- Action class: WRITE
- OPA rule(s) evaluated: N/A
- Security: Prevents unauthorized workflow triggers and abuse.

### Dependencies

Blocks: None
Depends on: [orchestrator-core] Design and implement core workflow/runbook authoring service

### DOR / DOD

- DOR: HMAC-signed webhooks design approved.
- DOD: Code merged, tests pass, documentation updated.

### Links

- Docs: SPRINT_MAESTRO_COMPOSER_BACKEND.md
