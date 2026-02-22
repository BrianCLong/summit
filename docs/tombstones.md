# Tombstones

## Lifecycle
Tombstones represent soft-deleted entities in the graph. They are used to maintain referential integrity and support "time-travel" or audit queries.

1.  **Active**: Node/Edge exists and `tombstoned = false` (or property is missing).
2.  **Tombstoned**: Node/Edge is marked with `tombstoned = true`, `tombstone_reason = "..."`, and `last_ingest_time`.
3.  **Hard Delete**: (Optional/Future) A background job removes tombstoned entities after a retention period (TTL), gated by evidence `EVD-INCR-GRAPH-DELETE-001`.

## Querying
Standard queries should filter out tombstoned entities unless specifically requested.
```cypher
MATCH (n:Entity) WHERE NOT n.tombstoned ...
```
