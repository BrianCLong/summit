# GraphPerf: Indexing Strategy

## Overview

To achieve P95 latency targets for path queries and evidence searches, we implement a set of targeted Neo4j indexes. These indexes ensure the query planner can anchor expansions efficiently and avoid expensive label scans.

## Indexes Created

### 1. `idx_evidence_body` (TEXT)
- **Label**: `Evidence`
- **Property**: `body`
- **Type**: `TEXT`
- **Purpose**: Accelerates substring searches using `CONTAINS`, `STARTS WITH`, and `ENDS WITH`. Unlike standard RANGE indexes, TEXT indexes are optimized for string predicates.

### 2. `idx_event_timestamp` (RANGE)
- **Label**: `Event`
- **Property**: `timestamp`
- **Type**: `RANGE`
- **Purpose**: Enables efficient range scans for temporal queries (e.g., events between two timestamps).

### 3. `idx_evidence_of_confidence` (RANGE)
- **Relationship**: `EVIDENCE_OF`
- **Property**: `confidence`
- **Type**: `RANGE`
- **Purpose**: Prunes graph expansions by filtering relationships below a certain confidence threshold. Scoped specifically to the `EVIDENCE_OF` relationship type.

## Rollout and Rollback

### Rollout
Indexes are created using idempotent `CREATE ... IF NOT EXISTS` syntax. They are applied via the standard migration runner or `tools/graphperf/runner.py`.

### Verification
Use `tools/graphperf/index_check.py` to confirm all indexes are in the `ONLINE` state.

### Rollback
If indexes cause significant write amplification or memory pressure, they can be dropped:
```cypher
DROP INDEX idx_evidence_body;
DROP INDEX idx_event_timestamp;
DROP INDEX idx_evidence_of_confidence;
```

## Performance Impact
Initial evaluations (`evals/graphperf/eval_index_build_effect.py`) show:
- Up to 10x reduction in `dbHits` for text searches on `Evidence`.
- Significant reduction in latency for temporal `Event` lookups.
