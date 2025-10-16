### Context

Source: SPRINT_MAESTRO_COMPOSER_BACKEND.md - 3) Non‑Functional Requirements - Security
Excerpt/why: "rate limits per tenant."

### Problem / Goal

Apply rate limiting policies on API endpoints on a per-tenant basis to prevent abuse and ensure fair resource usage.

### Proposed Approach

Implement a rate limiting mechanism (e.g., using Redis or an API gateway) that tracks API requests per tenant and rejects requests exceeding predefined thresholds.

### Tasks

- [ ] Define rate limiting policies per tenant.
- [ ] Implement rate limiting mechanism.
- [ ] Integrate rate limiting with API endpoints.

### Acceptance Criteria

- Given a tenant exceeds its rate limit, when further requests are made, then they are rejected with an appropriate HTTP status code (e.g., 429 Too Many Requests).
- Metrics/SLO: Rate limiting adds minimal overhead to request latency.
- Tests: Unit tests for rate limiting logic, integration tests for rate limit enforcement.
- Observability: Metrics for rate limit violations.

### Safety & Policy

- Action class: READ | WRITE
- OPA rule(s) evaluated: N/A

### Dependencies

Blocks: None
Depends on: [orchestrator-core] Configure Redis for queues, dedupe keys, and rate limit buckets

### DOR / DOD

- DOR: Rate limiting design approved.
- DOD: Rate limiting implemented, tests pass, documentation updated.

### Links

- Docs: SPRINT_MAESTRO_COMPOSER_BACKEND.md
