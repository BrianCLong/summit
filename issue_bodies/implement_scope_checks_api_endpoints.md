### Context

Source: SPRINT_MAESTRO_COMPOSER_BACKEND.md - 3) Non‑Functional Requirements - Security
Excerpt/why: "scope checks"

### Problem / Goal

Enforce scope-based authorization for all API endpoints in Maestro Composer.

### Proposed Approach

Define granular scopes for different API operations and integrate a middleware that checks the authenticated user's granted scopes against the required scopes for each endpoint.

### Tasks

- [ ] Define API scopes for all endpoints.
- [ ] Implement scope checking middleware.
- [ ] Integrate with JWT/OIDC claims for scope validation.

### Acceptance Criteria

- Given an authenticated request, when scope checks are performed, then access is granted only if the user's token contains the required scopes for the endpoint.
- Metrics/SLO: Scope checks add minimal overhead to request latency.
- Tests: Unit tests for scope checking logic, integration tests for API access control.
- Observability: Logs for scope validation failures.

### Safety & Policy

- Action class: READ | WRITE
- OPA rule(s) evaluated: N/A

### Dependencies

Blocks: None
Depends on: [orchestrator-core] Implement JWT/OIDC authentication for Maestro Composer

### DOR / DOD

- DOR: Scope check design approved.
- DOD: Scope checks implemented, tests pass, documentation updated.

### Links

- Docs: SPRINT_MAESTRO_COMPOSER_BACKEND.md
