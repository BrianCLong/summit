# Vacuum playbook: autovacuum, bloat control, and wraparound safety

## When to run this playbook

- Before every release or capacity bump.
- After incident reviews that cite slow queries, table scans, or autovacuum backlogs.
- As part of weekly maintenance in prod and monthly in non-prod.

## One-command health report

- Generate the structured report (includes Prometheus metric updates and JSON payload)
  ```bash
  cd server && DB_HEALTH=1 pnpm db:health
  ```
- Use `--limit=<n>` to adjust how many relations are inspected (defaults to 10).
- Output contains human-readable sections **and** a `BEGIN_DB_HEALTH_JSON` block you can ingest into tooling.

## Immediate safety checks

1. **Confirm autovacuum is on**
   ```sql
   SHOW autovacuum;
   SHOW autovacuum_naptime;
   SHOW autovacuum_freeze_max_age;
   ```
2. **Verify extension access (optional, only when DB_HEALTH=1)**
   ```sql
   CREATE EXTENSION IF NOT EXISTS pgstattuple;
   ```
   If the command fails due to privileges, re-run the health report; it will fall back to heuristics.

## Bloat remediation (no schema changes)

1. Target the worst tables (from the report’s “Top table bloat” list):
   ```sql
   VACUUM (ANALYZE) "schema"."table_name";
   ```
2. Rebuild bloated indexes without blocking writers:
   ```sql
   REINDEX INDEX CONCURRENTLY "schema"."index_name";
   ```
3. Raise autovacuum priority for hot tables (table-local reloptions):
   ```sql
   ALTER TABLE "schema"."table_name"
     SET (autovacuum_vacuum_scale_factor = 0.05,
          autovacuum_analyze_scale_factor = 0.03);
   ```
4. Nudge autovacuum to catch up globally (reload only):
   ```sql
   ALTER SYSTEM SET autovacuum_vacuum_scale_factor = '0.08';
   ALTER SYSTEM SET autovacuum_analyze_scale_factor = '0.05';
   ALTER SYSTEM SET log_autovacuum_min_duration = '1s';
   SELECT pg_reload_conf();
   ```

## Recommended autovacuum profiles

Use parameter groups (RDS/GCP/Azure) or `ALTER SYSTEM` + `pg_reload_conf()`; no migrations required.

| Environment | Settings                                                                                                                                                                                        |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dev         | `autovacuum_naptime=20s`, `autovacuum_vacuum_scale_factor=0.2`, `autovacuum_analyze_scale_factor=0.1`, `log_autovacuum_min_duration=0`                                                          |
| Stage       | `autovacuum_naptime=15s`, `autovacuum_vacuum_scale_factor=0.08`, `autovacuum_analyze_scale_factor=0.05`, `autovacuum_max_workers=5`, `vacuum_cost_limit=400`, `vacuum_cost_delay=10ms`          |
| Prod        | `autovacuum_naptime=10s`, `autovacuum_vacuum_scale_factor=0.04`, `autovacuum_analyze_scale_factor=0.02`, `autovacuum_max_workers=10`, `vacuum_cost_limit=800`, `log_autovacuum_min_duration=1s` |

## Alert rules and thresholds

- **Table bloat**: alert at ≥20% (`db_health_bloat_percent{kind="table"} > 20`).
- **Index bloat**: alert at ≥30% (`db_health_bloat_percent{kind="index"} > 30`).
- **Vacuum debt**: `db_health_vacuum_dead_tuples_over_threshold > 0` for 15 minutes.
- **Transaction wraparound**: `db_health_relation_xid_age / autovacuum_freeze_max_age > 0.8`.
- **Stale maintenance**: `last_autovacuum` or `last_autoanalyze` older than 24h on prod tables with write traffic.

## Safe execution order

1. Run the health report (read-only queries only).
2. Rebuild the worst **indexes first** (`REINDEX CONCURRENTLY`), then vacuum bloated tables.
3. Adjust autovacuum reloptions on specific offenders.
4. Apply global tunables and `pg_reload_conf()`.
5. Re-run `db:health` to verify bloat and debt are trending down.

## Observability integration

- Metrics emitted: `db_health_bloat_percent`, `db_health_vacuum_dead_tuples_over_threshold`, `db_health_relation_xid_age`.
- Structured log anchor: event=`db.health` (includes top offenders and alert counts).
- Suggested dashboard panels: top 5 bloated tables, wraparound risk list, autovacuum debt trend, recent autovacuum durations.

## Rollback/validation

- If latency spikes during vacuuming, raise `vacuum_cost_delay` (e.g., to `20ms`) and lower `vacuum_cost_limit`.
- Confirm backlog clearance:
  ```sql
  SELECT relname, n_dead_tup, last_autovacuum, last_autoanalyze
  FROM pg_stat_all_tables
  WHERE n_dead_tup > 0
  ORDER BY n_dead_tup DESC
  LIMIT 20;
  ```
- Keep a cold-failover plan ready: `SELECT pg_is_in_recovery();` should remain `false` on primaries throughout.
