### Context

Source: SPRINT_MAESTRO_COMPOSER_BACKEND.md - 0) North Star - SLOs (initial)
Excerpt/why: "p95 step handler latency < 1.5s baseline"

### Problem / Goal

Optimize individual workflow step handler latency to achieve a p95 of less than 1.5 seconds.

### Proposed Approach

Profile various step handler implementations, identify performance bottlenecks (e.g., external API calls, complex computations, database interactions), and apply optimizations such as caching, parallelization, or improved algorithms.

### Tasks

- [ ] Profile current step handler latencies.
- [ ] Identify and prioritize bottlenecks in common step types.
- [ ] Implement optimizations for critical step handlers.

### Acceptance Criteria

- Given a workflow step is executed, when measured, then the p95 step handler latency is < 1.5s.
- Metrics/SLO: p95 step handler latency < 1.5s baseline.
- Tests: Performance tests using k6.
- Observability: Step handler latency metrics visible in dashboards.

### Safety & Policy

- Action class: READ
- OPA rule(s) evaluated: N/A

### Dependencies

Blocks: None
Depends on: [ci-cd] Implement k6 performance tests for Maestro Composer backend

### DOR / DOD

- DOR: Step handler latency optimization plan approved.
- DOD: Optimizations implemented, tests pass, documentation updated.

### Links

- Docs: SPRINT_MAESTRO_COMPOSER_BACKEND.md
