# CDC to Projection System

This module provides a reliable blueprint for capturing PostgreSQL changes and projecting them into downstream stores (Postgres, Neo4j, etc.) with auditable, reproducible semantics.

## Architecture

1.  **Capture**: Changes are captured from PostgreSQL using logical decoding (e.g., `wal2json` or `pgoutput`).
2.  **Canonical Envelope**: Every change is normalized into a stable, deterministic JSON envelope.
3.  **Idempotency**: Downstream target adapters use upserts (`ON CONFLICT` in SQL, `MERGE` in Cypher) to ensure safety during replays.
4.  **Provenance**: Every write includes a `_evidence_id` derived from the source commit and projection name.

## Setup

### 1. Enable Logical Replication on Postgres

```sql
ALTER SYSTEM SET wal_level = logical;
SELECT pg_reload_conf();
```

### 2. Create a Replication Slot

```sql
SELECT * FROM pg_create_logical_replication_slot('proj_orders_v1', 'wal2json');
```

### 3. Run the Consumer

```bash
pg_recvlogical -d "$PGURL" --slot=proj_orders_v1 --start -f - \
| SOURCE_COMMIT=$(git rev-parse HEAD) PROJECTION_NAME=orders-v1 node src/canonical_consumer.js
```

## Evidence Tracking

Use `scripts/package-evidence.sh` to generate cryptographically verifiable evidence bundles that link source state to projection outcomes.

```bash
./scripts/package-evidence.sh orders-v1
```
