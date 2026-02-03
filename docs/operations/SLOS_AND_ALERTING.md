# SLOs and Alerting

Measurable reliability targets and the notification strategy for the Summit Platform.

## 1. Service Level Objectives (SLOs)

| Name | Metric | Threshold | Window |
|------|--------|-----------|--------|
| **API Availability** | Uptime of /health | 99.9% | 30d |
| **Request Latency** | GraphQL p95 | < 1.5s | 24h |
| **Error Rate** | 5xx response ratio | < 0.5% | 1h |
| **Audit Integrity** | Audit Sink Delivery | 100% | 24h |

## 2. Critical Alerting Hooks

Alerts are triggered via Alertmanager based on Prometheus metrics.

### Tier 1: P0 (Immediate Action)
- **`AuditSinkFailure`**: Triggered if the persistent audit store is unreachable.
  * *Metric*: `summit_audit_sink_errors_total > 0`
- **`AuthFailureRate`**: High rate of 401/403 responses.
  * *Metric*: `rate(http_requests_total{status=~"401|403"}[5m]) > 10`
- **`DBPoolExhaustion`**: PostgreSQL or Neo4j connection pool full.
  * *Metric*: `summit_postgres_pool_waiting > 5`

### Tier 2: P1 (Investigation Required)
- **`SLOBreachWarning`**: Performance trending toward threshold.
  * *Metric*: `summit_graphql_p95_latency_seconds > 1.2`
- **`PolicyGateFailClosed`**: OPA evaluation errors.
  * *Metric*: `summit_policy_eval_errors_total > 0`

## 3. Wiring

Monitoring is initialized in `server/src/monitoring/metrics.ts`.
Grafana dashboards are available at: `https://monitor.summit.internal/dashboards`
