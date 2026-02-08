---
title: Postgres CDC Blueprint
summary: Deterministic, auditable CDC flow from Postgres to projections with evidence semantics.
owner: data-eng
version: v1
lastUpdated: 2026-02-08
---

# Postgres CDC Blueprint: Deterministic, Auditable Projections

## Purpose
This blueprint defines a deterministic, auditable Change Data Capture (CDC) flow from Postgres to
projection targets (Postgres, Neo4j, Elasticsearch). It enforces reproducible semantics, evidence
bundles, and conflict rules aligned with Summit governance and readiness standards.

## Readiness Alignment
- **Summit Readiness Assertion**: Governed CDC must preserve replayability, provenance, and
  deterministic evidence bundles. See
  [Summit Readiness Assertion](../SUMMIT_READINESS_ASSERTION.md).
- **Governed Exceptions**: Any legacy bypass (e.g., backfill shortcuts) must be captured as a
  Governed Exception with explicit rollback triggers and evidence references.

## 1) Capture changes from Postgres (logical decoding)

### Enable logical replication

```sql
ALTER SYSTEM SET wal_level = logical;
SELECT pg_reload_conf();
```

### Pick a decoder

- **pgoutput**: best for Debezium/Kafka Connect ecosystems.
- **wal2json**: compact JSON for lightweight consumers.

### Slot strategy
Create one logical replication slot per projection (or bounded consumer group) to isolate lag and
support independent replay.

```sql
SELECT * FROM pg_create_logical_replication_slot('proj_orders_v1', 'wal2json');
```

## 2) Canonical change event envelope

Each row-level mutation emits a stable envelope. Normalize types (timestamps, numerics) to prevent
consumer drift.

```json
{
  "source_id": "pg://clusterA/db1/schema.table/PK:123",
  "schema_version": 3,
  "op_type": "c|u|d",
  "ts_source": "2026-02-07T05:55:21.123456Z",
  "commit_lsn": "0/16B4F20",
  "before": { "...": "..." },
  "after": { "...": "..." },
  "evidence_id": "sha256:<commit>@projection:<name>"
}
```

### Evidence semantics
- `evidence_id` derives from the source Git commit and projection name (optionally schema version).
- Evidence IDs are stored alongside projection rows or in an append-only ledger.

## 3) Idempotent application on consumers

### Postgres target

```sql
INSERT INTO orders_proj (id, col_a, col_b, updated_at, _evidence_id)
VALUES ($1, $2, $3, $4, $5)
ON CONFLICT (id) DO UPDATE
SET col_a = EXCLUDED.col_a,
    col_b = EXCLUDED.col_b,
    updated_at = EXCLUDED.updated_at,
    _evidence_id = EXCLUDED._evidence_id;
```

### Neo4j target

```cypher
MERGE (o:Order {id: $source_id})
SET o += $after,
    o.updated_at = datetime($ts_source),
    o._schema_version = $schema_version,
    o._evidence_id = $evidence_id
```

### Deletes
Treat deletes explicitly. Prefer tombstones unless retention policy allows `DETACH DELETE`.

## 4) Deterministic provenance ledger

### Projection ledger DDL (Postgres)

```sql
CREATE TABLE IF NOT EXISTS projection_ledger (
  projection_name TEXT NOT NULL,
  commit_lsn TEXT NOT NULL,
  evidence_id TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  batch_id TEXT,
  source_commit TEXT NOT NULL,
  schema_version INTEGER NOT NULL,
  PRIMARY KEY (projection_name, commit_lsn)
);

CREATE INDEX IF NOT EXISTS projection_ledger_evidence_idx
  ON projection_ledger (evidence_id);
```

### Evidence bundle payload

```json
{
  "evidence_id": "sha256:c0mm17sha@projection:orders-v1",
  "slot": "proj_orders_v1",
  "commit_lsn": "0/16B4F20",
  "applied_at": "logical-ts:2026-02-07T05:55:21Z"
}
```

## 5) Conflict resolution

- Deterministic precedence: `(ts_source, source_id)`.
- Multi-writer scenarios: use a version vector or an explicit conflict strategy.
- Soft errors (constraint failures, transient conflicts) route to a reconciliation queue with full
  event context.

## 6) Operational guardrails

- One slot per projection; monitor `pg_replication_slots` and `pg_stat_replication`.
- Schema changes: bump `schema_version` and ship compatible consumers before producers.
- Replays: consumers must be idempotent and support LSN-based seek.
- Backfill: snapshot once, then switch to streaming; tag backfill events with `op_type = "r"`.

## 7) Minimal reference stack

### wal2json + pg_recvlogical

```bash
pg_recvlogical -d "$PGURL" \
  --slot=proj_orders_v1 --start -o pretty-print=1 -f - \
| node ./consumers/orders.js
```

### orders.js (sketch)

```js
import readline from 'node:readline';
import crypto from 'node:crypto';
import { upsertOrder, tombstoneOrder, enqueueForReview } from './targets/postgres.js';

const EVID = (commit, proj) =>
  `sha256:${crypto.createHash('sha256').update(`${commit}@projection:${proj}`).digest('hex')}`;

const COMMIT_SHA = process.env.SOURCE_COMMIT || 'unknown';
const PROJECTION = 'orders-v1';

const rl = readline.createInterface({ input: process.stdin });
rl.on('line', async (line) => {
  const msg = JSON.parse(line);
  for (const change of msg.change || []) {
    const evt = toCanonical(change);
    evt.evidence_id = EVID(COMMIT_SHA, PROJECTION);
    await applyEvent(evt);
  }
});

async function applyEvent(e) {
  switch (e.op_type) {
    case 'c':
    case 'u':
      await upsertOrder(e);
      break;
    case 'd':
      await tombstoneOrder(e.source_id, e.evidence_id);
      break;
    default:
      await enqueueForReview(e);
  }
}
```

## 8) GA checklist

- [ ] `wal_level=logical` and slots created per projection
- [ ] Canonical event schema includes `source_id`, `schema_version`, `op_type`, `evidence_id`
- [ ] Consumers are strictly idempotent (upserts / MERGE)
- [ ] `evidence_id` stored with every write or in `projection_ledger`
- [ ] Deterministic conflict policy documented and enforced
- [ ] Reconciliation queue captures soft errors
- [ ] Snapshot → stream handover tested; replay from LSN verified
- [ ] Schema-version bumps tested with mixed producers/consumers

## MAESTRO Security Alignment

- **MAESTRO Layers**: Foundation, Data, Tools, Infra, Observability, Security.
- **Threats Considered**: WAL tampering, replay injection, prompt/tool abuse by consumers,
  evidence forgery, lag-based data skew.
- **Mitigations**: slot isolation, evidence_id hashing, append-only projection ledger, LSN-based
  replay controls, explicit reconciliation queue, and monitoring on replication lag.

## See also

- [Streaming GA Readiness](./GA_READINESS.md)
- [Streaming Architecture](./ARCHITECTURE.md)
- [Offset Semantics](./OFFSET_SEMANTICS.md)

## Next steps

- Implement Debezium connector configs for target projections.
- Add CI evidence bundle packaging for projection ledger batches.
- Extend reconciliation queue with auto-triage and SLA alerts.
