# Golden Path Observability & Alert Response

Use this runbook when Grafana dashboards or Alertmanager/PagerDuty incidents indicate a regression on the user-facing golden path (API → Gateway → Ingest).

## Quick links

- Dashboard: `ops/observability/grafana/dashboards/golden-path-service-health.json` (import into Grafana; pin service/environment variables).
- Alerts: `ops/alerts/golden-path-alerts.yml` (PagerDuty routes via `pagerduty_service: sre-primary`).
- Prometheus datasource: `prometheus` (assumes standard federation and `job` labels: `intelgraph-api`, `intelgraph-gateway`, `intelgraph-ingest`).

## Triage checklist

1. **Confirm the signal**
   - Error rate: open the "Error Rate by Service" panel and verify which service is spiking.
   - Latency: review the "Latency Quantiles" panel and cross-check `histogram_quantile` outputs for p95/p99.
   - Throughput: validate the "Request Throughput" panel to distinguish user traffic drops from upstream failures.
2. **Scope the blast radius**
   - Check environment variable in Grafana (prod/staging/dev) to avoid noisy lower envs.
   - Use PromQL to spot-check the impacted service:
     ```promql
     sum(rate(http_requests_total{job="intelgraph-api",status=~"5.."}[5m]))
       /
     sum(rate(http_requests_total{job="intelgraph-api"}[5m]))
     ```
3. **Stabilize the path**
   - If error rate >1% for >5m: initiate canary rollback or disable the latest feature flag impacting the affected service.
   - If p95 latency >1.2s for >10m: scale the relevant deployment (API/Gateway/Ingest) + verify downstream (DB, Kafka) saturation.
   - If throughput <5 rps unexpectedly: inspect ingress/load balancer health, then restart edge pods if they are flapping.
4. **Collect diagnostics**
   - Capture logs around spike windows (`kubectl logs -l app=intelgraph-api --since=15m`).
   - Record dashboard screenshots and PromQL queries in the incident ticket.
5. **Communicate and escalate**
   - Page the owning squad via PagerDuty if not already engaged.
   - Post a status update in the SRE channel with the suspected cause, mitigations started, and ETA.

## Verification and close-out

- Keep the dashboard pinned for at least 30 minutes after mitigation; confirm error rate <1%, p95 latency <1.2s, and throughput stabilizes above normal baseline.
- Add follow-up actions to the incident ticket (test coverage gaps, tuning, capacity changes).
- Update `ops/alerts/golden-path-alerts.yml` thresholds if false positives occur; include justification in the PR description.
