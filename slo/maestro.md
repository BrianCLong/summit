# Maestro API SLOs

This document defines the production Service Level Objectives (SLOs) for the Maestro control-plane API exposed at `/api/maestro/v1`. The SLOs below target the customer-facing orchestration endpoints that gate end-to-end Maestro runs.

## Endpoint scope

- `GET /runs`, `GET /runs/{id}` — list and detail views for orchestration runs.
- `POST /runs` — create a new Maestro run.
- `GET /pipelines`, `GET /pipelines/{id}` — pipeline catalog access.
- `POST /pipelines/{id}/executions` — kick off a pipeline execution.

## Objectives and SLIs

| Endpoint(s) | SLI (Prometheus) | Objective | Notes |
| --- | --- | --- | --- |
| All Maestro API paths | `sum(rate(http_requests_total{service="maestro-api",path=~"/api/maestro/v1/.*",code!~"5.."}[5m])) / sum(rate(http_requests_total{service="maestro-api",path=~"/api/maestro/v1/.*"}[5m]))` | 99.9% availability, 30d window | Aligns with the repo-wide `maestro-api` availability objective; tracked by `error-budget-monitoring.yml` for burn-rate breaches. |
| Read APIs (`GET /runs`, `GET /runs/{id}`, `GET /pipelines`, `GET /pipelines/{id}`) | `histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{service="maestro-api",path=~"/api/maestro/v1/(runs|pipelines).*"}[5m])) by (le,path))` | p95 < 300ms, 30d window; ≥99% of requests meet the target | Ensures control-plane reads stay responsive for the UI and routing layer. |
| Mutating APIs (`POST /runs`, `POST /pipelines/{id}/executions`) | `sum(rate(http_requests_total{service="maestro-api",path=~"/api/maestro/v1/(runs|pipelines/.*/executions)",code!~"5.."}[5m])) / sum(rate(http_requests_total{service="maestro-api",path=~"/api/maestro/v1/(runs|pipelines/.*/executions)"}[5m]))` | 99.5% success ratio, 30d window | Captures orchestration writes that block new executions; burn-rate alerts trigger when fast (5m) > 14.4x or slow (1h) > 6x budget. |
| Run creation latency (`POST /runs`) | `histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{service="maestro-api",path="/api/maestro/v1/runs"}[5m])) by (le))` | p95 < 400ms, 30d window; ≥99% compliance | Guards request-to-accept timing for workflow fan-out. |

## Alert routing

- **Fast burn-rate gate:** The route SLO gate workflow fails if the 5m burn rate exceeds 14.4× the allowed error budget for any Maestro endpoint.
- **Slow burn-rate gate:** The scheduled error-budget monitor files an issue/Slack alert if the 1h burn rate exceeds 6× budget or if availability drops below its objective.
- **Artifacts:** Both workflows attach burn-rate context to their logs and markdown reports so on-call can correlate breaches with recent Maestro deployments.
