# Graph↔PG Sync Validator

Deterministic CDC-to-graph validation with audit-grade gate outputs.

## Pass/Fail Gates

- `Gate A` parity: per table/label count + keyset parity within drift threshold
- `Gate B` fidelity: every FK row maps to exactly one graph edge
- `Gate C` tx alignment: every graph mutation carries `(lsn, txid, commit_ts)` and has OpenLineage linkage
- `Gate D` freshness: graph lag stays within commit timestamp SLO

## Usage

```bash
node packages/graph-sync-validator/scripts/graph-sync-validate.mjs
node packages/graph-sync-validator/scripts/parity-recon.mjs \
  --metrics artifacts/graph-sync/metrics.json \
  --output artifacts/graph-sync/recon.json
```

Environment variables:

- `GRAPH_SYNC_OUT_DIR` output directory (default `artifacts/graph-sync`)
- `GRAPH_SYNC_MAX_LAG` Gate A drift threshold (default `0.001`)
- `GRAPH_SYNC_FRESHNESS_SLO_SECONDS` Gate D lag SLO (default `60`)
- `GRAPH_SYNC_LINEAGE_WINDOW_SECONDS` Gate C lineage emit delay window (default `30`)
- `PG*` Postgres connection vars
- `NEO4J_*` Neo4j connection vars

## Artifacts

- `metrics.json` full gate-by-gate metrics
- `recon.json` actionable parity/reconciliation summary
- `openlineage.jsonl` mutation lineage events generated from source snapshot metadata
- `stamp.json`, `evidence.json` deterministic evidence bundle records

## Scaffold Assets

- `scaffold/cdc/` TypeScript CDC consumer scaffold (`pg logical events -> Neo4j apply -> OpenLineage`)
- `cypher/` idempotent upsert/delete templates with `(txid,lsn)` replay guards
- `sql/pg_cdc_setup.sql` logical slot + checksum view bootstrap
