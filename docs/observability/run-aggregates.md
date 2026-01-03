# Run Aggregates & Critical Path

Raw spans are pre-aggregated into request-first analytics for fast querying and ROI tracking.

## Tables

- `obs_raw_spans` – append-only spans emitted from pipelines
- `obs_run_aggregates` – request-level metrics (totalDurationMs, queueWaitMs, execMs, bestCaseDurationMs, wastedQueueMs, criticalPathStages, errorCount, retryCount, status)
- `obs_run_tree` – compact tree payload used by the UI (includes `onCriticalPath` markers)

## Aggregation rules

- **Total duration**: max(end) - min(start)
- **Queue wait**: sum of spans where `kind=queue`
- **Execution time**: sum of spans where `kind in (exec, compute, io)`
- **Best-case duration**: longest path ignoring queue spans (queue duration treated as zero)
- **Wasted queue**: `totalDurationMs - bestCaseDurationMs` (clamped to >= 0)
- **Critical path**: stages on the longest path after queue removal
- **Error/Retry**: counts from spans where `status=error` or `retryCount>0`

## API

When `OBS_RUNS_UI_ENABLED=true`:

- `GET /api/observability/runs` – list aggregates with optional filters (`status`, `minWastedQueueMs`, `since`, `until`, `limit`, `offset`)
- `GET /api/observability/runs/:runId` – returns aggregate + tree; triggers aggregation on first access if needed

## Retention

This slice stores raw spans for replay and durable aggregates. Retention can be enforced via database TTLs; defaults are 14 days for raw spans and 90 days for aggregates (configurable via DBA policies).
