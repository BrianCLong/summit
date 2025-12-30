# Runbook: <Service Name>

## Owners & Paging

- Primary on-call rotation: <PagerDuty schedule or Slack channel>
- Escalation path: <manager / duty officer>
- Paging policy: Page for P1/P2 (5xx >2%, latency P95 >500ms 10m, saturation >85%), ticket for P3.

## Quick Links

- Dashboard: docs/observability/golden-dashboard.json
- Alerts: docs/observability/alert-rules.yaml
- SLO: document + error budget policy
- Traces: <Jaeger/Tempo URL with `trace_id` filter>
- Logs: <log search URL filtered by `trace_id`>

## Service Overview

- Purpose: <one-line summary>
- Dependencies: <DBs, queues, external APIs>
- Data sensitivity: <PII class / customer_id policy>

## Standard Telemetry

- Logging fields: trace_id, span_id, request_id, actor, customer_id (if allowed), decision_id, build_sha
- Metrics: rate, error rate, latency buckets, queue_depth, resource_saturation_ratio, http_retries_total, cache_hits_total
- Tracing: inbound `http.request` span + `db.query`, `cache.get`, `external.http`, `policy.evaluate`

## Diagnostics

1. Capture the `trace_id` from alerts/logs and open the trace view.
2. Pivot to logs using the same `trace_id` to confirm error context.
3. Check `/metrics` for rate/error/latency spikes and queue depth.
4. Verify saturation (CPU/worker pool) and retry volume.

## P1/P2 Playbook

- 5xx/latency spike:
  - Rollback to last known good `build_sha`.
  - Enable synthetic probe hitting `/maybe-error?fail=1` to reproduce.
  - Inspect recent deployments and config changes.
- Saturation/queue backlog:
  - Scale worker pool; drain backlog; verify downstream health.
  - Throttle callers using feature flags if necessary.

## Post-Incident

- Record trace URL and correlated logs (`trace_id`).
- Update SLO error budget burn; attach to incident ticket.
- Capture follow-up tasks and prevention steps.
