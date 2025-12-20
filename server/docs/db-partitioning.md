# Event store partitioning (DB_PARTITIONS_V1)

## Why
- `event_store` is our largest, most write-heavy table and all queries are already scoped by `tenant_id`, `aggregate_id`, and timestamps.
- Partitioning by tenant (list) with monthly sub-partitions keeps indexes hot and enables fast retention drops without full-table vacuums.
- Rollout is additive and guarded by `DB_PARTITIONS_V1=1` with dual writes to the legacy table for safe rollback.

## What shipped
- New partitioned parent: `event_store_partitioned` (list by `tenant_id`, monthly range sub-partitions).
- Online helpers:
  - `ensure_event_store_partition(tenant_id, months_ahead, retention_months)` – creates tenant/month buckets and prunes old ones.
  - `ensure_event_store_partitions_for_all(months_ahead, retention_months)` – sweeps all tenants (prefers `tenants` table, falls back to legacy event_store tenants).
  - Metrics views: `event_store_partition_metrics` (leaf size/bounds) and `event_store_partition_overview` (count + size distribution).
- Runtime dual-write/read support in `EventSourcingService` behind `DB_PARTITIONS_V1`:
  - Writes go to `event_store_partitioned` + `event_store`.
  - Reads use the partitioned table and union legacy rows that have not yet been backfilled.
  - Partition creation is automatic per-tenant on first write.
- Ops script: `pnpm --filter intelgraph-server partition:maintain --tenant <id>` (or run for all tenants) to pre-create partitions and emit a size table.

## Rollout / rollback (no downtime)
1. Apply the managed migration:
   ```bash
   pnpm --filter intelgraph-server db:migrate:managed
   ```
2. Pre-create partitions (optional but recommended before enabling reads):
   ```bash
   pnpm --filter intelgraph-server partition:maintain --months-ahead 2 --retention-months 18
   ```
3. Enable dual-write + partitioned reads:
   ```bash
   export DB_PARTITIONS_V1=1
   pnpm --filter intelgraph-server dev
   ```
4. Verify pruning with EXPLAIN (example):
   ```sql
   EXPLAIN (COSTS OFF)
   SELECT count(*) FROM event_store_partitioned
   WHERE tenant_id = 'tenant-a' AND event_timestamp >= now() - interval '1 day';
   ```
   The plan should show only the matching tenant/month partition.
5. Rollback: unset `DB_PARTITIONS_V1` to read from the legacy table, then run the down migration to drop partitioned artifacts if desired.

## Retention hooks
- Monthly sub-partitions are dropped when they fall outside `retention_months` (default 18) every time `ensure_event_store_partition*` runs.
- The ops script exposes current partition sizes; use that output to confirm retention effects.

## Metrics
- `SELECT * FROM event_store_partition_metrics ORDER BY total_bytes DESC LIMIT 10;`
- `SELECT * FROM event_store_partition_overview;`

## Tests / smoke
- Integration test spins up Postgres with the partition migration, validates dual writes, EXPLAIN output shows tenant partitions, and asserts metrics views exist.
