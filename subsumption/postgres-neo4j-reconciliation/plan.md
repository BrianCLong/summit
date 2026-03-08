# Subsumption Plan: Deterministic Postgres to Neo4j Reconciliation

## 1. Context & Motivation
Keeping Postgres and Neo4j synchronized requires deterministic, spec-locked reconciliation loops that use row digests and monotonic LSN (Log Sequence Number) cursors. The objective is to use Debezium CDC events to mirror state cleanly.

## 2. Core Components

### 2.1 Postgres Canonical Row Digest
Generate a canonical row digest on the source side to ignore volatile fields (like `last_updated`).

```sql
-- Requires extension: pgcrypto
CREATE OR REPLACE VIEW v_my_table_digest AS
SELECT
  id,
  encode(
    digest(
      jsonb_strip_nulls(to_jsonb(t) - 'last_updated')::text,
      'sha256'
    ),
    'hex'
  ) AS pk_digest
FROM my_table t;
```

### 2.2 Reconciliation Fetch Window
Fetch the CDC events from the replication stream in monotonically increasing order.

```sql
-- Fetch CDC events by LSN windows
-- Inputs: :last_lsn, :end_lsn
SELECT event_type, table_name, pk, pk_digest, payload, lsn, event_seq
FROM cdc_events
WHERE lsn > :last_lsn AND lsn <= :end_lsn
ORDER BY lsn, event_seq;
```

### 2.3 Neo4j Safe Upserts & Idempotency
Use `MERGE` to find or create nodes, ensuring that updates only occur if the incoming event's LSN is strictly greater than the node's existing LSN.

```cypher
MERGE (n:Entity {id: $id})
ON CREATE SET
    n.digest = $pk_digest,
    n.createdAt = timestamp()
ON MATCH SET
    n.updatedAt = CASE WHEN $lsn > coalesce(n.__last_applied_lsn, 0) THEN timestamp() ELSE n.updatedAt END,
    n.digest = CASE WHEN $lsn > coalesce(n.__last_applied_lsn, 0) THEN $pk_digest ELSE n.digest END
WITH n
WHERE $lsn > coalesce(n.__last_applied_lsn, 0)
SET n += $payloadProps, n.__last_applied_lsn = $lsn
```

### 2.4 Tombstone Semantics (Deletes)
Process Debezium tombstones (deletes) explicitly, converting them to idempotent soft-deletes in Neo4j and recording the deletion LSN.

```cypher
MATCH (n:Entity {id: $id})
WHERE $lsn > coalesce(n.__last_applied_lsn, 0) AND coalesce(n.deleted, false) = false
SET n.deleted = true,
    n.__tombstone_lsn = $lsn,
    n.__last_applied_lsn = $lsn,
    n.updatedAt = timestamp()
```

## 3. Configuration & Metrics

- **Debezium**: Set `delete.tombstone.handling.mode` properly so explicit tombstones are preserved.
- **Metrics**: Track `reconciliation_rate`, `window_drift_count`, `tombstone_replay_count`, and `reconciliation_convergence_time`.


### 3.1 Sample Debezium Configuration

Use the following configuration snippet for your Debezium connector to ensure explicit tombstones are preserved for the reconciler.

```json
{
  "name": "inventory-connector",
  "config": {
    "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
    "tasks.max": "1",
    "database.hostname": "postgres",
    "database.port": "5432",
    "database.user": "debezium",
    "database.password": "dbz",
    "database.dbname": "inventory",
    "database.server.name": "dbserver1",
    "plugin.name": "pgoutput",
    "publication.autocreate.mode": "filtered",
    "transforms": "unwrap",
    "transforms.unwrap.type": "io.debezium.transforms.ExtractNewRecordState",
    "transforms.unwrap.drop.tombstones": "false",
    "transforms.unwrap.delete.handling.mode": "rewrite",
    "delete.tombstone.handling.mode": "tombstone_and_rewrite"
  }
}
```

### 3.2 Metrics Skeleton (Prometheus)

Use the following Prometheus metrics skeleton to prove convergence of your reconciliation loop.

```python
from prometheus_client import Gauge, Counter

# Measure reconciliation rate
reconciliation_rate = Counter(
    'reconciliation_rate_total',
    'Number of rows processed per second',
    ['sink_type', 'table_name']
)

# Measure how many records show digest drift per window
window_drift_count = Gauge(
    'window_drift_count',
    'Number of records with digest mismatch in the current LSN window',
    ['sink_type', 'table_name']
)

# Count how many tombstones are re-applied successfully
tombstone_replay_count = Counter(
    'tombstone_replay_count_total',
    'Total number of delete tombstones re-applied idempotently',
    ['sink_type', 'table_name']
)

# Measure convergence latency
reconciliation_convergence_time = Gauge(
    'reconciliation_convergence_time_seconds',
    'Seconds until window_drift_count reaches 0',
    ['sink_type', 'table_name']
)
```
