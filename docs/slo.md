# IntelGraph Service-Level Objectives

The platform tracks reliability against a small set of SLOs that map directly to user experience. Targets are defined for p95 latency, availability, and error budgets; alert rules and dashboards consume the same metrics to keep operators aligned.

## SLO Catalog

| Dimension | Target | Measurement | Notes |
| --- | --- | --- | --- |
| p95 latency | ≤ 1.0s for user-facing GraphQL/HTTP services; 0.8s for Copilot; 1.2s for ingest; 1.5s for analytics | `histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{service=~"(api|gateway|copilot|ingest|vertical-intel)"}[5m]))` | Mirrors the latency panels on the IntelGraph Overview dashboard. |
| Availability | ≥ 99.9% success ratio across 30d | `1 - (sum(rate(http_requests_total{status=~"5.."}[30d])) / sum(rate(http_requests_total[30d])))` | Uses application metrics; backed by blackbox probes for external readiness. |
| Error budget | 0.1% of requests failing per 30d (burn alerts at 2%/5m and 1%/30m) | `service:error_ratio:rate5m` and `service:error_ratio:rate30m` recording rules | Drives paging policies via PagerDuty and Slack. |
| Cache efficiency | ≥ 85% hit ratio | `sum(rate(cache_hits_total[5m])) / (sum(rate(cache_hits_total[5m])) + sum(rate(cache_misses_total[5m])))` | Visible on the cache hit/miss Grafana panel; improves latency headroom. |

## Alerting Contracts

- **Latency breach:** `ServiceP95LatencyHigh` triggers when p95 latency exceeds 1s for 10 minutes.
- **Availability burn:** `ServiceAvailabilityErrorBudgetBurn` pages when 5xx rates exceed 2% over 5m and 1% over 30m.
- **Health probes:** `HealthProbeFailure` pages when blackbox probes drop below 99% success for 5 minutes.
- **Routing:** Alerts are grouped by service, sent to Slack for visibility, and routed to PagerDuty for `severity=page` events.

## Measurement Sources

- **Metrics:** Prometheus scrapes `/metrics` from services and the narrative simulation engine; recording rules live in `ops/prometheus/observability-slo-rules.yaml`.
- **Traces:** Jaeger/OTel traces carry `service`, `operation`, and `status_code` tags; dashboards link directly to traces for slow paths.
- **Logs:** Structured JSON logs (meta-router and narrative engine) include `event`, `latency_ms`, `service`, and `status` to accelerate debugging.

## Run Targets Locally

1. Apply Prometheus and Alertmanager config: `kubectl apply -k ops/observability/monitoring-stack`.
2. Import the IntelGraph Overview dashboard (`ops/grafana/dashboards/intelgraph-overview.json`) in Grafana.
3. Hit `/api/narrative/metrics` to verify the simulation engine is exposing metrics; ensure `/metrics` endpoints return the SLO recording rules.

## Governance

SLOs are reviewed monthly with product and reliability owners. Any change to targets must accompany: (a) updated dashboards, (b) PagerDuty routing confirmation, and (c) runbook updates in `RUNBOOKS/observability.md`.
