
## Phase 2: Reliability & Observability

### SLOs
Defined in `infra/slo/*.yaml`.
-   **Availability**: 99.9% for API.
-   **Latency**: P95 < 500ms for core tasks.

### Telemetry
-   Structured logging with correlation IDs.
-   `SLOEvaluationEngine` tracks compliance against error budgets.
