# SLO Dashboard Scaffold

Use these notes to seed Grafana (or CloudWatch dashboards) for the initial SLO set. Name panels with the SLO IDs from `docs/ops/reliability-slos.md` so links remain stable.

## Panels

- **SLO-1 Graph query availability**
  - PromQL: `sum(rate(http_request_total{route="/graph/query",status=~"2..|3.."}[5m])) / sum(rate(http_request_total{route="/graph/query"}[5m]))`
  - Include 30d burn-rate panel using `slo_burn_check` helper if available; otherwise, graph 1d/7d error rates.
- **SLO-2 Workflow completion latency**
  - PromQL: `histogram_quantile(0.95, sum by (le) (rate(workflow_completed_seconds_bucket[5m])))`
  - Add panel comparing P50/P95, split by tenant when the label exists.
- **SLO-3 Incident notification responsiveness**
  - Until metrics exist, add a table panel sourced from `docs/incidents/` postmortems (manual data entry) with columns: incident ID, severity, alert time, ack time, delta.

## Alerts

- Configure alert rules for 24h and 7d burn rates per SLO. Tie SEV2 pages to SLO-1/SLO-2 24h burn, and SEV3 notifications to 7d burn.

## Annotations & links

- Add an annotation stream for deployments (CI/CD webhook) and link incidents to relevant panels using the incident ID.
