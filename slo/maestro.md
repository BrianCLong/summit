# Maestro API SLOs

This document captures the Service Level Objectives for the Maestro orchestration API. It focuses on the high-traffic endpoints surfaced in `maestro-orchestration-api.yaml`, tying each objective to a concrete SLI and PromQL query that can be evaluated by the CI/CD gates.

## Scope

- API base path: `/api/maestro/v1`
- Core endpoints: `/runs`, `/runs/{runId}`, `/pipelines`, `/budgets/tenant`, `/alertcenter/events`
- Metrics: `maestro_api_requests_total`, `maestro_api_request_duration_seconds_bucket` (both with `path` and `status` labels)

## Objectives and SLIs

| Endpoint | Objective | SLI Type | PromQL (5m rate windows) |
| --- | --- | --- | --- |
| `/runs` & `/runs/{runId}` | 99.9% availability, 95% of calls under 450ms | Availability | `1 - (sum by (path) (rate(maestro_api_requests_total{path=~"/runs(|/[^/]+)",status=~"5.."}[5m])) / sum by (path) (rate(maestro_api_requests_total{path=~"/runs(|/[^/]+)"}[5m])))` |
| | | Latency (p95) | `histogram_quantile(0.95, sum by (le) (rate(maestro_api_request_duration_seconds_bucket{path=~"/runs(|/[^/]+)"}[5m])))` |
| `/pipelines` | 99.5% availability, 95% of calls under 400ms | Availability | `1 - (sum(rate(maestro_api_requests_total{path="/pipelines",status=~"5.."}[5m])) / sum(rate(maestro_api_requests_total{path="/pipelines"}[5m])))` |
| | | Latency (p95) | `histogram_quantile(0.95, sum by (le) (rate(maestro_api_request_duration_seconds_bucket{path="/pipelines"}[5m])))` |
| `/budgets/tenant` | 99.9% availability, 95% of calls under 300ms | Availability | `1 - (sum(rate(maestro_api_requests_total{path="/budgets/tenant",status=~"5.."}[5m])) / sum(rate(maestro_api_requests_total{path="/budgets/tenant"}[5m])))` |
| | | Latency (p95) | `histogram_quantile(0.95, sum by (le) (rate(maestro_api_request_duration_seconds_bucket{path="/budgets/tenant"}[5m])))` |
| `/alertcenter/events` | 99.0% availability, 95% of calls under 600ms | Availability | `1 - (sum(rate(maestro_api_requests_total{path="/alertcenter/events",status=~"5.."}[5m])) / sum(rate(maestro_api_requests_total{path="/alertcenter/events"}[5m])))` |
| | | Latency (p95) | `histogram_quantile(0.95, sum by (le) (rate(maestro_api_request_duration_seconds_bucket{path="/alertcenter/events"}[5m])))` |

## Burn-rate policy

- Error-budget burn rate alerts fire when the short-window burn rate exceeds **2.0×** the allowed budget for any endpoint above.
- The same threshold is enforced in CI (`.github/workflows/route-slo-gate.yml`) and in continuous monitoring (`.github/workflows/error-budget-monitoring.yml`) so the gate and runtime alerts stay consistent.
- Burn rate is calculated as:  
  `burn_rate = (1 - success_ratio) / (1 - objective)`

## Operational hooks

- CI gate: `route-slo-gate` queries the per-route ratios above and fails the run if latency, error ratio, or burn rate exceeds the objective.
- Runtime monitoring: `error-budget-monitoring` publishes a Markdown report and opens/updates incidents when an objective is breached or burn rate crosses the 2.0× threshold. Both the issue body and Slack notification include the failing endpoint names for quick triage.
