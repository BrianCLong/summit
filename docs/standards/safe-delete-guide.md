# Safe Delete Guide for Postgres -> Debezium -> Neo4j

This guide outlines the standard for implementing safe, auditable deletes across our data pipeline.

## Why this matters

Deletes are easy to lose in streaming: you need the row’s **prior state**, a **stable key**, and a **compaction‑friendly tombstone** so sinks stay correct and idempotent.

## 1. Postgres: Enable REPLICA IDENTITY FULL

For critical tables where we need the full "before" state on delete (e.g., `users`, `tenants`, `investigations`), we must enable `REPLICA IDENTITY FULL`.

```sql
ALTER TABLE public.users REPLICA IDENTITY FULL;
```

This ensures that the WAL contains the full row data for DELETE operations, not just the primary key.

## 2. Debezium/Kafka: Configure Tombstones and Key Handling

Our Debezium connector must be configured to emit tombstones and handle deletes correctly.

### Key Configuration Parameters:

*   `tombstones.on.delete=true`: Ensures a tombstone (null value) message is sent after the delete event, allowing Kafka log compaction to eventually remove the record.
*   `transforms.unwrap.delete.handling.mode=rewrite`: Wraps the delete event so the "before" state is preserved in the value, which is crucial for downstream consumers to know *what* was deleted.
*   `delete.tombstone.handling.mode=drop`: (Optional depending on sink) Configures how the connector handles the tombstone itself.
*   `message.key.columns`: Explicitly define the key columns if the table doesn't have a PK or if we want a specific key structure.

Example Config:
```json
{
  "tombstones.on.delete": "true",
  "transforms.unwrap.delete.handling.mode": "rewrite",
  "delete.tombstone.handling.mode": "drop"
}
```

## 3. Neo4j: Idempotent, Audit-Trail Delete Pattern

We use a "snapshot then delete" pattern in Neo4j to preserve history.

### Cypher Pattern

1.  **Match** the node to be deleted.
2.  **Snapshot** the node's final state into an immutable event with a unique hash constraint.
3.  **Facet** the event with OpenLineage and W3C-PROV metadata.
4.  **Detach Delete** the original node.

This ensures we have an immutable record of the deletion.

```cypher
// 1) Snapshot the node’s final state into an immutable event
MATCH (n) WHERE id(n) = $id OR n.id = $id
WITH n,
     apoc.map.fromPairs([k IN keys(n) | [k, n[k]]]) AS props,
     apoc.util.md5($source + ":" + $table + ":" + toString($id)) AS pk_hash
MERGE (e:DeletionEvent {
  source: $source, table: $table, pk_hash: pk_hash
})
ON CREATE SET
  e.props = props,
  e.deleted_at = datetime($commit_ts),
  e.txid = $txid,
  e.lsn = $lsn

// 2) Optional lineage facets for OpenLineage/W3C‑PROV
SET e.openlineage = {operation: "delete"}
SET e.prov = {
  wasInvalidatedBy: {
    activity_id: $activity_id,
    agent: $agent,
    commit_ts: $commit_ts,
    txid: $txid, lsn: $lsn
  }
}

// 3) Remove the live node, safely
WITH n
DETACH DELETE n;
```

## Implementation Artifacts

*   **Postgres Setup**: `migrations/postgres/safe_delete_setup.sql`
*   **Debezium Config**: `connect/pg-cdc-safe-delete.json`
*   **Neo4j Procedure**: `ops/backups/neo4j/safe_delete.cypher`
*   **Neo4j Cypher Snippet**: `ops/backups/neo4j/safe_delete_pattern.cypher`
