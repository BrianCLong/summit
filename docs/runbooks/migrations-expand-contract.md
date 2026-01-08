# Migrations Expand/Contract Playbook

## Overview

This runbook describes the gated, reversible migration process across Postgres, Neo4j, and Typesense. Every change must follow expand/contract with shadow writes and reads.

## Preconditions

- Feature flags available: `db.dual_write`, `db.shadow_read`, `db.backfill.rps`, `db.cutover.enabled`.
- Secrets stored via SOPS/Sealed-Secrets; no plaintext DSNs.

## Steps

1. **Plan**
   - Postgres: `./.ci/scripts/migrations/plan_postgres.sh` (requires `POSTGRES_URL`, `ALEMBIC_CONFIG`).
   - Neo4j: `./.ci/scripts/migrations/plan_neo4j.sh`.
   - Typesense: `./.ci/scripts/migrations/plan_typesense.sh`.
2. **Policy Check**
   - `conftest test migrations --policy .ci/policies` to block destructive operations without gate override.
3. **Dry-run / Shadow creation**
   - Run dry-run scripts; provision `_shadow` tables/graphs/indexes.
4. **Enable dual-write**
   - Set `DB_DUAL_WRITE=true` in preview/stage; validate structured logs emit `shadow=true` spans.
5. **Backfill**
   - Deploy workers under `services/*/workers/backfill_*`; throttle using `db.backfill.rps` flag.
6. **Shadow reads**
   - Enable `db.shadow_read=true` and route 1–5% traffic; execute `shadow_compare.py --output shadow-report.json`.
7. **Cutover (guarded)**
   - Flip aliases/views to shadow datasets only during canary; confirm SLO health checks.
8. **Contract**
   - Remove legacy objects only after 7 days of zero reads and `db.contract.allow=true`.

## Observability

- Metrics: `db_dual_write_errors_total`, `db_shadow_read_mismatch_ratio`, `db_backfill_progress_ratio`, `db_backfill_lag_seconds`.
- Traces: include `shadow=true/false`, `table`, `record_id`, and link IDs.

## Success Criteria

- Gate passes: plan + policy + dry-run + shadow compare + backfill started.
- PR comment includes plan diff, risk summary, row deltas, consistency hash, rollback plan.
