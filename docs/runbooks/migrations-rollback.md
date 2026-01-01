# Migrations Rollback Playbook

## Goals
Quickly revert schema/index changes with minimal blast radius, restoring traffic to legacy paths.

## Pre-rollback checklist
- Dual-write enabled and healthy metrics.
- Shadow read mismatch ratio near zero.
- Pre-apply snapshots captured (pg_dump/neo4j dump/typesense export).

## Execution Steps
1. **Freeze writes**
   - Set `db.dual_write=false` and pause backfill workers.
2. **Revert routing**
   - Swap aliases/views back to legacy tables/indexes.
3. **Restore snapshots**
   - Postgres: `psql $POSTGRES_URL -f rollback-plan/postgres_preapply.sql` (or PITR bookmark).
   - Neo4j: `neo4j-admin load --from=rollback-plan/neo4j_preapply.dump --database=neo4j`.
   - Typesense: re-create collection from `typesense_snapshot.json`.
4. **Re-enable reads**
   - Turn off shadow reads; verify app health endpoints.
5. **Consistency check**
   - Run `shadow_compare.py --output rollback-validation.json` against legacy paths to confirm parity.
6. **Resume traffic**
   - Enable writes gradually, monitor SLOs and error budgets.

## Validation
- Metrics return to baseline (zero dual-write errors, zero mismatch ratio).
- Smoke tests on golden paths succeed.

## Communication
- Announce rollback start/finish in #release channel.
- File post-incident note including root cause and prevention actions.
