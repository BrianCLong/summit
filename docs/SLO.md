# Service Level Objectives (SLOs)

Summit Platform defines the following Service Level Objectives to ensure high availability and performance.

## Defined SLOs

| Metric | Objective | Description |
|--------|-----------|-------------|
| **GraphQL Latency (p95)** | ≤ 1.5s | 95% of GraphQL requests must be served within 1.5 seconds. |
| **Error Rate** | < 1% | The ratio of failed requests (5xx/errors) to total requests must be less than 1%. |

## Monitoring

### Dashboards

A Grafana dashboard "Summit SLOs" is provisioned automatically at `http://localhost:3001/d/summit-slos`.
It visualizes:
- Real-time p95 Latency gauge.
- Real-time Error Rate gauge.

### SLO Exporter

A dedicated service `slo-exporter` runs in the stack (port 9099) and aggregates these metrics from Prometheus.
It exposes:
- `summit_graphql_p95_latency_seconds`
- `summit_graphql_error_rate`

These metrics are scraped by Prometheus and used for the dashboard.

## CI Guardrails

The CI pipeline enforces these SLOs via:
1. **Smoke Test Performance Check**: Fails if critical API paths exceed thresholds.
2. **Guarded Code Gate**: Runs smoke tests and health checks before allowing merge.

## Future Improvements

- Automated badge generation for README.
- Alerting rules in Alertmanager for SLO breaches.
