# Reporting Materialized Views Playbook

This service now keeps high-traffic reporting endpoints on materialized views
instead of OLTP tables. The stack ships with three views and an accompanying
refresh/logging function.

## Views

- `maestro.mv_reporting_entity_activity` — entity counts by day and type
- `maestro.mv_reporting_case_snapshot` — per-case rollup (status, entities,
  evidence counts, transition metadata)
- `maestro.mv_reporting_case_timeline` — daily case transition rollups

All three are refreshed together by
`maestro.refresh_reporting_materialized_views()`, which records metrics in
`maestro.mv_refresh_status`.

## Runtime controls

- `MV_REPORTING=1` — route reporting endpoints to the materialized views
- `MV_REFRESH_INTERVAL_SECONDS` (default 300) — background refresh cadence
- `MV_STALENESS_BUDGET_SECONDS` (default 900) — budget surfaced via
  `X-Reporting-Staleness` response header
- `MV_REPORTING_FALLBACK` (default true) — fall back to base tables if MV
  queries fail
- `MV_REFRESH_CONCURRENT` (default true) — set to `false` when CONCURRENTLY is
  unavailable (e.g., in pg-mem based tests)

## Operations

### Manual refresh

```sql
-- Optional: turn off concurrent refresh if your environment lacks support
SELECT set_config('maestro.reporting_refresh_concurrent', 'off', false);

SELECT * FROM maestro.refresh_reporting_materialized_views();
```

### Observability

Check latest refresh status, duration, and row counts:

```sql
SELECT view_name,
       last_success_at,
       last_duration_ms,
       rows_last_refreshed,
       last_status,
       last_error
FROM maestro.mv_refresh_status
ORDER BY view_name;
```

HTTP responses include `X-Reporting-Source` (`materialized`/`base`) and
`X-Reporting-Staleness` (seconds since last refresh) when the feature flag is
enabled.

### Troubleshooting

- **Stuck/stale data**: run a manual refresh and verify `last_status` in
  `mv_refresh_status`.
- **Concurrent refresh errors**: disable concurrency via
  `set_config('maestro.reporting_refresh_concurrent', 'off', false)` or set
  `MV_REFRESH_CONCURRENT=false`.
- **API errors on MV queries**: leave `MV_REPORTING` unset/0 to force base-table
  reads while triaging.
- **Unexpected counts**: verify base tables (cases, case_state_history,
  case_graph_references, signed_manifests) contain expected rows; the views are
  pure rollups.
