# graph-pg-guard

Postgres-to-Neo4j change capture and reconciliation guard. Supports both Postgres logical decoding (via `wal2json`) and a deterministic outbox table fallback.

## Features

- **Primary capture path:** Logical decoding via `wal2json` producing normalized `ChangeEvent`.
- **Fallback capture path:** Deterministic outbox table + triggers, polled in order, with exactly-once semantics per event ID.
- **Idempotency & ordering:** Maintain a persisted cursor (LSN for WAL; monotonic ID for outbox) so reconciliation is replay-safe.
- **Determinism:** Event payload serialization is stable (canonical JSON, stable key order) and no timestamps leak into deterministic artifacts.

## Installation

```bash
pnpm install
```

## Local Development

Start the local Postgres (with logical decoding enabled) and Neo4j:

```bash
docker compose -f docker/docker-compose.yml up -d
```

## Running

### Run with outbox fallback (default)

```bash
CAPTURE_MODE=outbox \
PG_URL=postgres://postgres:postgres@localhost:5432/postgres \
NEO4J_URL=bolt://localhost:7687 \
NEO4J_USER=neo4j \
NEO4J_PASS=test \
npm run dev
```

### Run with wal2json

```bash
CAPTURE_MODE=wal \
PG_URL=postgres://postgres:postgres@localhost:5432/postgres \
NEO4J_URL=bolt://localhost:7687 \
NEO4J_USER=neo4j \
NEO4J_PASS=test \
npm run dev
```

## Cursor Behavior

The cursor is persisted to `.graph-pg-guard.cursor.json` (configurable via `CURSOR_PATH`). It uses atomic writes (write temp -> fsync -> rename) to ensure it's always in a consistent state.

## Failure/Replay Model

- **Reconcile is idempotent:** All Neo4j operations use `MERGE` based on the primary key.
- **At-least-once capture:** The cursor is advanced only AFTER a batch of events has been successfully reconciled in Neo4j.
- **Replay safety:** If the process crashes, it will resume from the last persisted cursor, re-processing events from that point.
