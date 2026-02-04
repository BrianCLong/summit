# Graph↔PG Sync Validator

This package provides a continuous validation tool to ensure data consistency between Postgres (canonical source) and Neo4j (graph view).

## Features
- **Deterministic Snapshots**: Uses materialized views in Postgres and ordered exports in Neo4j.
- **Strict Comparison**: Checks ID parity, referential integrity, and content hash equality.
- **Evidence Generation**: Produces verifiable JSON artifacts (`stamp.json`, `metrics.json`, `evidence.json`).

## Usage
Run the validator:
```bash
node bin/graph-sync-validate.mjs
```

Environment variables:
- `GRAPH_SYNC_OUT_DIR`: Output directory for artifacts (default: `artifacts/graph-sync`).
- `GRAPH_SYNC_MAX_LAG`: Max allowed lag rate (default: 0.001).
- `PG*`: Postgres connection variables (standard libpq env vars).
- `NEO4J_*`: Neo4j connection variables (used by cypher-shell).

## Schemas
See `evidence/schemas/` for artifact schemas.
