# Observability Dashboards for Privacy & Access Accounting

## Dashboards

1. **Privacy Budget Overview**
   - Panels: remaining budget per tenant/dataset, burst window usage, trend of `privacy.accessed.v1` events.
   - Alerts: `remaining < 10%` (warning), `remaining <= 0` (critical block) with PagerDuty routing.
2. **Purpose Compliance**
   - Panels: percentage of sensitive requests with valid `X-Purpose`, top invalid attempts, purpose distribution by dataset.
   - Drill-down: links to request traces tagged with `purpose` and `tenant`.
3. **Access Accounting**
   - Panels: volume by user/role, top datasets accessed, anomalies (z-score >3 over 24h baseline).
   - Export: weekly CSV for compliance review.

## Data Sources

- Prometheus metrics: `privacy_budget_remaining`, `privacy_budget_burst_usage`, `purpose_missing_total`.
- Kafka/Redpanda topic `privacy.accessed.v1` visualized via Loki/Grafana through log export.
- Postgres audit table `audit.access_log` used for long-term retention and reports.

## Example Queries

- **Budget Remaining**: `privacy_budget_remaining{tenant="acme",dataset="signals"}`
- **Purpose Violations**: `sum(rate(purpose_missing_total[5m])) by (tenant)`
- **Access Spike**: Grafana math on log count with moving average baseline.

## Review Cadence

- Daily automated alerts
- Weekly governance review (Data Privacy WG)
- Monthly export attached to compliance packet
