# SLOs & Observability: CompanyOS Data Spine

## Service Level Objectives
- **Ingestion success:** 99.5% of events successfully persisted to raw sink within 1 minute of `occurred_at` (monthly rolling window).
- **Audit freshness:** 95% of audit materializations reflect source events within 5 minutes.
- **CDC lag:** 99% of CDC events landed within 10 minutes of source transaction commit.
- **Schema health:** 100% of new event versions validated against registry before deploy.

## SLIs & Metrics
- `events_produced_total` / `events_ingested_total` (per event_type, tenant).
- `ingest_failures_total` with labels: event_type, reason (schema_validation, transport, sink_error).
- `ingest_latency_seconds` histogram (`recorded_at` - `occurred_at`).
- `audit_materialization_lag_seconds` gauge by tenant/topic.
- `cdc_lag_seconds` gauge per source table; `cdc_backlog_records` gauge.
- `schema_validation_failures_total` counter from CI + staging canary jobs.

## Dashboards
- **Spine Overview:** event rate, ingest failure rate, P99 ingest latency, DLQ backlog, CDC lag.
- **Audit Freshness:** audit lag over time per tenant; number of stale partitions; success/failure of latest job runs.
- **Lineage Health:** count of runs with missing lineage metadata; last successful lineage write per job.

## Alerts
- **Critical:**
  - `ingest_failures_total` >1% for 5m on any event_type.
  - `audit_materialization_lag_seconds` >900 for 10m.
  - `cdc_lag_seconds` >600 or `cdc_backlog_records` increasing for 15m.
- **Warning:**
  - Schema validation failures in CI or staging canary.
  - Lineage writes failing for >3 consecutive job runs.

## Runbook Links
- [Data Spine Ingestion & Audit Materialization](./runbooks/data-spine-audit-ingestion.md)
- [Observability](./OBSERVABILITY.md) for base metrics patterns

## Post-incident Validation
- Replay DLQ samples through validation to confirm recovery.
- Assert canary allow/deny authz events appear in audit view with <5m lag.
- Record RCA, remediation, and prevention actions in incident tracker.
