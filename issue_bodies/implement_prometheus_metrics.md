### Context

Source: SPRINT_MAESTRO_COMPOSER_BACKEND.md - 1) Scope & Deliverables - 1.5 Observability & SRE
Excerpt/why: "Prom metrics (RED)"

### Problem / Goal

Expose Prometheus metrics following the RED (Rate, Errors, Duration) methodology for key services in Maestro Composer.

### Proposed Approach

Instrument critical code paths in API, queue, and worker services to emit Prometheus-compatible metrics for request rate, error rate, and request duration.

### Tasks

- [ ] Identify key services for RED metrics.
- [ ] Implement Prometheus client libraries.
- [ ] Expose RED metrics endpoints.

### Acceptance Criteria

- Given services are running, when Prometheus scrapes metrics, then RED metrics are correctly exposed and reflect service behavior.
- Metrics/SLO: Metrics collection adds no more than 2% overhead to service latency.
- Tests: Unit tests for metric instrumentation, integration tests for metric exposure.
- Observability: Metrics visible in Prometheus and Grafana.

### Safety & Policy

- Action class: READ
- OPA rule(s) evaluated: N/A

### Dependencies

Blocks: None
Depends on: None

### DOR / DOD

- DOR: Prometheus metrics design approved.
- DOD: Instrumentation implemented, tests pass, documentation updated.

### Links

- Docs: SPRINT_MAESTRO_COMPOSER_BACKEND.md
