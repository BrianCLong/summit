# Query Capture & Index Pack (2025-03-15)

This pack adds a lightweight Postgres query-capture mode (dev/stage only) and the first wave of indexes aimed at the heaviest offenders observed in benchmarking and historical perf notes.

## How to capture top queries

1. Set `DB_QUERY_CAPTURE=1` (optional: `DB_QUERY_CAPTURE_INTERVAL_MS=30000`).
2. Start the server; every interval we log the top 20 queries by **total time** and **p95** with the truncated SQL text.
3. A final snapshot is emitted on pool shutdown.

## Top 20 query signatures & index actions

| # | Query (shape) | Index / action | Status |
| - | ------------- | -------------- | ------ |
| 1 | Relationships by tenant + `src_id` ordered by `created_at` | `idx_relationships_tenant_src_created_at` | **Added** |
| 2 | Relationships by tenant + `dst_id` ordered by `created_at` | `idx_relationships_tenant_dst_created_at` | **Added** |
| 3 | Relationship counts by tenant + `props->>'investigationId'` | `idx_relationships_tenant_investigation_id_full` | **Added** |
| 4 | Entity counts by tenant + `props->>'investigationId'` | `idx_entities_tenant_investigation_id_full` | **Added** |
| 5 | Investigations list by tenant + status ordered by `created_at` | `idx_investigations_tenant_status_created_at` | **Added** |
| 6 | Entity search by tenant + kind + created_at | `idx_entities_tenant_kind_created_at` | **Added** |
| 7 | Entity JSONB search (`props @> …`) | `idx_entities_gin` (existing) | ✅ Existing |
| 8 | Relationship JSONB search (`props @> …`) | `idx_relationships_props_gin` (existing) | ✅ Existing |
| 9 | Investigation stats (entity/relationship counts by investigation) | Uses #3 + #4 | **Added** |
| 10 | Relationship search by tenant + type | `idx_rels_tenant_type` (legacy) | ✅ Existing |
| 11 | Relationship search by tenant + src/dst equality | `idx_rels_src_dst` (legacy) | ✅ Existing |
| 12 | Outbox polling where `processed_at IS NULL` | `idx_outbox_unprocessed` (partial) | ✅ Existing |
| 13 | Audit events by actor + time | `idx_audit_events_actor_idx`, `idx_audit_events_created_idx` | ✅ Existing |
| 14 | Document chunks by tenant + document_id | `idx_chunks_tenant_doc` | ✅ Existing |
| 15 | Embeddings by entity/tenant | `idx_embeddings_entity`, `idx_embeddings_tenant` | ✅ Existing |
| 16 | Ingestion runs by tenant + pipeline | `idx_runs_tenant_pipeline` | ✅ Existing |
| 17 | Ingestion DLQ unresolved items | `idx_dlq_unresolved` | ✅ Existing |
| 18 | Relationship counts by tenant + src/dst (parallel count) | Uses #1/#2 | **Added** |
| 19 | Entity search by tenant + kind + props (GraphRAG) | Uses #6 + #7 | ✅ Covered |
| 20 | Investigation DataLoader by id array | PK + tenant filters | ✅ Covered |

## Before/after EXPLAIN (ANALYZE, BUFFERS)

### Relationships by `src_id` (ordered)
- **Before**: bitmap scan + heap sort, 5.14 ms for 10k-row hot key.  
```text
Limit  (cost=16.08..16.09 rows=3 width=24) (actual time=5.030..5.033 rows=20 loops=1)
  ->  Sort  ... Sort Method: top-N heapsort
        ->  Bitmap Heap Scan on relationships
              Recheck Cond: (src_id = '3cf80394-a6a1-4acc-ac01-2501399572df'::uuid)
              Filter: (tenant_id = 'tenant-A'::text)
              rows=10002
```
- **After**: direct index scan on covering index, 0.46 ms.  
```text
Limit  (cost=0.42..7.01 rows=20 width=24) (actual time=0.260..0.390 rows=20 loops=1)
  ->  Index Scan using idx_relationships_tenant_src_created_at
        Index Cond: ((tenant_id = 'tenant-A') AND (src_id = '3cf80394-a6a1-4acc-ac01-2501399572df'))
```

### Relationships by `dst_id` (ordered)
- **Before**: index scan on `(src_id, dst_id)` + heapsort, 13.19 ms.  
```text
Limit  (cost=1958.32..1958.32 rows=3 width=24) (actual time=13.084..13.087 rows=20 loops=1)
  ->  Sort ... top-N heapsort
        ->  Index Scan using idx_rels_src_dst on relationships
              Index Cond: (dst_id = '8e06c3ed-2567-4e8b-92f3-a46b7b38dfb4'::uuid)
              Filter: (tenant_id = 'tenant-A')
              rows=8004
```
- **After**: covering index by tenant/dst_id/created_at, 0.31 ms.  
```text
Limit  (cost=0.42..8.28 rows=20 width=24) (actual time=0.260..0.267 rows=20 loops=1)
  ->  Index Scan using idx_relationships_tenant_dst_created_at
        Index Cond: ((tenant_id = 'tenant-A') AND (dst_id = '8e06c3ed-2567-4e8b-92f3-a46b7b38dfb4'))
```

### Relationship counts by `investigationId`
- **Before**: full seq scan, 24.68 ms (68k rows filtered).  
```text
Aggregate  (actual time=21.075..21.077 rows=1 loops=1)
  ->  Seq Scan on relationships
        Filter: ((tenant_id = 'tenant-A') AND ((props ->> 'investigationId') = 'inv-10'))
        Rows Removed by Filter: 67875
```
- **After**: targeted composite index, 1.71 ms.  
```text
Aggregate  (actual time=1.450..1.451 rows=1 loops=1)
  ->  Index Scan using idx_relationships_tenant_investigation_id_full on relationships
        Index Cond: ((tenant_id = 'tenant-A') AND ((props ->> 'investigationId') = 'inv-10'))
```

### Entity counts by `investigationId`
- **Before**: seq scan over 20k entities, 11.68 ms.  
```text
Aggregate  (actual time=11.394..11.395 rows=1 loops=1)
  ->  Seq Scan on entities
        Filter: ((tenant_id = 'tenant-A') AND ((props ->> 'investigationId') = 'inv-10'))
        Rows Removed by Filter: 19950
```
- **After**: composite index on tenant + extracted id, 1.92 ms.  
```text
Aggregate  (actual time=1.675..1.676 rows=1 loops=1)
  ->  Index Scan using idx_entities_tenant_investigation_id_full on entities
        Index Cond: ((tenant_id = 'tenant-A') AND ((props ->> 'investigationId') = 'inv-10'))
```

### Investigations list by tenant/status
- **Before**: seq scan + sort, 0.55 ms.  
```text
Limit  (actual time=0.382..0.405 rows=50 loops=1)
  ->  Seq Scan on investigations
        Filter: ((tenant_id = 'tenant-A') AND (status = 'active'))
```
- **After**: covering index eliminates sort, 0.28 ms.  
```text
Limit  (actual time=0.137..0.159 rows=50 loops=1)
  ->  Index Scan using idx_investigations_tenant_status_created_at
        Index Cond: ((tenant_id = 'tenant-A') AND (status = 'active'))
```
