
# Sync Materialization Runbook

## Overview
The new sync system moves from a "journal exchange" model to "server-side materialization". This means the server actively maintains the current state of all objects based on the operations (journal entries) it receives.

## Data Model

### 1. Journal (`sync_journal`)
- Immutable, append-only log of operations.
- Fields: `op_id`, `tenant_id`, `vector_clock`, `payload`, `timestamp`.
- Source of truth for history and auditability.

### 2. Materialized Objects (`sync_objects`)
- Represents the current "winning" state of an object.
- Derived from the journal using the Merge Engine.
- Fields: `object_id`, `payload`, `vector_clock` (of the winner), `is_tombstone`.

### 3. Conflicts (`sync_conflicts`)
- Records whenever a concurrent update is detected and resolved.
- Contains references to the winning and losing op_ids and the reason code.

## Merge Logic
The server uses a deterministic merge strategy based on Vector Clocks:

1.  **Dominance**: If op A's clock is strictly after current state B's clock, A wins.
2.  **Staleness**: If A is strictly before B, A is ignored.
3.  **Concurrency**: If A and B are concurrent (neither dominates):
    - **Delete Wins**: Tombstones beat updates.
    - **Deterministic Tie-Breaker**: If same type (update vs update), string comparison of payload decides winner.
    - **Conflict Recorded**: A record is added to `sync_conflicts`.

## Selective Sync (Pull V2)
Clients pull changes using `POST /api/sync/v2/pull`.
- **Inputs**: `sinceCursor`, `scope` (types, ids, tags).
- **Output**: Materialized objects changed since the cursor.
- **Incremental Sync**: The `serverCursor` returned should be used for the next pull.

## Operational Notes

### Migrations
- The system co-exists with legacy sync.
- New tables `sync_journal`, `sync_objects`, `sync_conflicts` are added.

### Rollback
- If the new materialization logic is buggy, we can:
    1.  Stop the V2 API endpoints.
    2.  Truncate `sync_objects` and `sync_conflicts`.
    3.  Replay `sync_journal` (feature to be added) to rebuild state with fixed logic.

### Auditing
- Query `sync_conflicts` to see how often clients are diverging.
- Use `sync_journal` to reconstruct the history of any object.
