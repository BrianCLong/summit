# Database Performance Runbook

**Primary Dashboard:** Grafana → `Database Health`

## Trigger Conditions
- `DatabaseLatencyWarning` ticket.
- Observability synthetic check latency above 200ms.

## Immediate Actions
1. Confirm incident priority with on-call DB engineer.
2. Snapshot `db_active_connections` and `db_cpu_usage` metrics for RCA.
3. Enable connection throttling feature flag `db.pool.maxConnections` if concurrency > threshold.

## Diagnostics
- Prometheus queries:
  - `histogram_quantile(0.95, sum(rate(db_query_duration_seconds_bucket{service="db"}[5m])) by (le))` for real-time latency.
  - `sum(rate(db_lock_wait_seconds_total{service="db"}[5m]))` to identify lock contention.
- Check slow query log in Loki: `{service="db",slow="true"}`.
- Inspect recent schema migrations for regressions.

## Mitigations
- Apply index hotfix using Terraform change set if missing index identified.
- Scale read replicas via `terraform apply -target=module.database_replica` (requires change approval).
- If locks persist, kill offending sessions using runbook script `scripts/db/terminate_blockers.sql`.

## Post-Incident
- Update capacity plan workbook with new peak metrics.
- Schedule load test to revalidate 350ms latency SLO buffer.
