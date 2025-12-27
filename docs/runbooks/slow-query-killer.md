# Slow Query Killer Runbook

## Symptoms

- `SlowQueryKillRateHigh` alert firing
- Elevated query latency / timeouts
- Logs show `Slow query detected - attempting to kill` or
  `Slow query killed successfully`

## Immediate Actions

1. Open the alert **drilldown_url** to view recent kill events.
2. Pivot from the logs to the request/trace ID fields (when available) and
   identify the caller or workflow.
3. Check the API Golden Signals dashboard for concurrent latency spikes.

## Drill-Down Workflow

### Loki log search

Use the drilldown URL provided in the alert to view kill events:

```
{app="intelgraph-server"} |= "Slow query killed successfully"
```

### DB observability snapshot

If you need current DB state, request a snapshot via the admin endpoint:

```
POST /api/admin/db-observability/snapshot
```

See `docs/how-to-debug-lock-contention.md` for example payloads.

## Mitigation

- Apply safe query optimizations (index review, limit reductions).
- Temporarily raise the slow-query threshold only if validated by the
  on-call and documented in the incident log.
- Coordinate with DBAs for blocking locks or long-running migrations.

## Follow-up

- Add or update indexes for the hottest slow-query fingerprints.
- Update SLO budgets if the workload shift is expected and approved.
- Attach the incident postmortem to the alert ticket.
