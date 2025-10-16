### Context

Source: SPRINT_MAESTRO_COMPOSER_BACKEND.md - 1) Scope & Deliverables - 1.5 Observability & SRE
Excerpt/why: "OTEL tracing across API→queue→worker"

### Problem / Goal

Instrument the system with OpenTelemetry for end-to-end tracing from API calls through queues to workers.

### Proposed Approach

Integrate OpenTelemetry SDKs into the API gateway, queuing system, and worker processes, ensuring proper context propagation across service boundaries.

### Tasks

- [ ] Configure OpenTelemetry collectors.
- [ ] Instrument API gateway for tracing.
- [ ] Instrument queuing system for tracing.
- [ ] Instrument worker processes for tracing.

### Acceptance Criteria

- Given a request flows through the system, when observed in a tracing tool, then a complete end-to-end trace is visible from API to worker.
- Metrics/SLO: OTEL tracing adds no more than 5% overhead to request latency.
- Tests: Integration tests for trace propagation.
- Observability: Traces visible in tracing backend (e.g., Jaeger, Zipkin).

### Safety & Policy

- Action class: READ
- OPA rule(s) evaluated: N/A

### Dependencies

Blocks: None
Depends on: None

### DOR / DOD

- DOR: OTEL tracing design approved.
- DOD: Instrumentation implemented, tests pass, documentation updated.

### Links

- Docs: SPRINT_MAESTRO_COMPOSER_BACKEND.md
