# Graph Sync Validator

Graph Sync Validator provides read-only parity audits and controlled repair planning between Postgres and Neo4j using an entity map. It standardizes node/edge normalization, drift detection, reporting, and optional repair actions behind explicit allowlists.

## Usage

```bash
pnpm -C packages/graph-sync-validator build
pnpm -C packages/graph-sync-validator graph-sync:audit --outdir artifacts/graph-parity
```

## Configuration

Environment variables:

- `PG_DSN`
- `NEO4J_URI`
- `NEO4J_USER`
- `NEO4J_PASS`
- `GRAPH_ENTITY_MAP` (default: `packages/graph-sync-validator/entity-map.yml`)
- `GRAPH_PARITY_THRESHOLD` (default: `0.999`)
- `GRAPH_SYNC_BATCH` (default: `1000`)
- `GRAPH_SYNC_OUTPUT` (`text`, `jsonl`, `junit`)
- `ALLOW_GRAPH_REPAIR` (set to `1` to enable writes)

## Notes

- Repairs are disabled by default and require `ALLOW_GRAPH_REPAIR=1` plus an environment allowlist.
- Edge normalization follows explicit direction rules from the entity map to maintain deterministic keys.
