# Choosing BRIN vs. B-tree in Summit/IntelGraph

Time-ordered event tables (e.g., `audit_events`, `event_store`, `usage_events`) grow fast and are append-only. Picking the right index keeps timeline queries fast and keeps write amplification low.

## When to choose BRIN

- **Append-only, time-ordered tables** where new rows arrive with increasing timestamps (e.g., audit logs, event streams).
- **Large row counts** where traditional B-tree indexes become heavy to maintain (millions+ rows).
- **Range filters on time** with occasional tenant or type filters. BRIN stores block summaries, so range predicates such as `timestamp BETWEEN ...` or `event_timestamp >= ...` avoid whole-table scans.
- **Hot ingestion paths** where minimal index maintenance overhead is required.

**Current BRIN targets**

- `audit_events` on `(tenant_id, timestamp | created_at)` — accelerates timeline queries and audit dashboards.
- `event_store` on `(tenant_id, event_timestamp)` — accelerates aggregate replay windows.

## When to choose B-tree

- **High-selectivity lookups** (exact keys, small subsets) such as `id`, `tenant_id + id`, or `action = 'login'`.
- **Frequent updates/deletes** where page summaries (BRIN) become stale; B-tree stays accurate.
- **Join keys** and **unique constraints** (BRIN cannot enforce uniqueness).
- **Small/medium tables** where the simpler planner path of B-tree is sufficient.

## Practical guidance for this repo

- Default to **BRIN** for large, append-only timeline/event tables with time-range filters.
- Layer **B-tree** on the same table for **point lookups** (e.g., `id`, `tenant_id + correlation_id`) and uniqueness.
- Prefer **partitioned rollups** (daily/weekly) for analytics views; guard rollup reads with `TIMELINE_ROLLUPS_V1=1` and keep refresh jobs resumable.
- Keep BRIN `pages_per_range` modest (e.g., 32–64) to balance scan selectivity vs. maintenance cost; adjust after inspecting `EXPLAIN (ANALYZE, BUFFERS)`.
- For new tables, decide at creation time:
  - **Is it append-only and primarily scanned by time?** Add BRIN on `(time [, tenant_id])`.
  - **Do we need uniqueness or point lookups?** Add B-tree side-by-side on the appropriate key(s).

## Observability tips

- Use `EXPLAIN (FORMAT JSON)` in tests to assert a `Bitmap Index Scan` over the BRIN index for time-bounded queries.
- Track rollup freshness via `audit_event_rollup_state`; failed runs capture `last_error` and timestamps.
- If a BRIN plan regresses, check table ordering (avoid backfills out of order) and consider running `VACUUM`/`ANALYZE` or adjusting `pages_per_range`.
