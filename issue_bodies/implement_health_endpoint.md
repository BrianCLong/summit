### Context

Source: SPRINT_MAESTRO_COMPOSER_BACKEND.md - 1) Scope & Deliverables - 1.5 Observability & SRE
Excerpt/why: "health `/health` includes dependencies."

### Problem / Goal

Develop a `/health` endpoint that reports the health status of the service and its critical dependencies.

### Proposed Approach

Implement an HTTP endpoint that performs checks on internal components (e.g., database connections, Redis connectivity, external APIs) and aggregates their status into a single health report.

### Tasks

- [ ] Define `/health` endpoint.
- [ ] Implement health checks for internal components.
- [ ] Implement health checks for external dependencies.

### Acceptance Criteria

- Given a request to `/health`, when the endpoint is called, then it returns a 200 OK status if all dependencies are healthy, and an appropriate error status otherwise, detailing unhealthy dependencies.
- Metrics/SLO: Health check p95 latency < 50ms.
- Tests: Unit tests for health check logic, integration tests for endpoint.
- Observability: Health status visible in monitoring systems.

### Safety & Policy

- Action class: READ
- OPA rule(s) evaluated: N/A

### Dependencies

Blocks: None
Depends on: None

### DOR / DOD

- DOR: Health endpoint design approved.
- DOD: Endpoint implemented, tests pass, documentation updated.

### Links

- Docs: SPRINT_MAESTRO_COMPOSER_BACKEND.md
