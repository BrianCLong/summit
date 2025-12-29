# Neo4j Query Optimization Guide

## Overview

This guide details the strategy and tools available for optimizing Neo4j queries in the IntelGraph platform.

## Optimization Strategy

1.  **Analysis**: Use `server/src/db/optimization/analysis.ts` to profile slow queries.
2.  **Indexing**: Use `GraphIndexAdvisorService` to identify missing indexes. Run `server/src/scripts/apply_indexes.ts` to apply them.
3.  **Caching**: Use `withCache` helper in `server/src/utils/cacheHelper.ts` for read-heavy resolvers.
4.  **Monitoring**: Check the "Neo4j Performance" Grafana dashboard.

## Tools

### 1. Slow Query Analysis

The analysis script profiles a set of critical queries (placeholders currently, should be updated with real logs) and checks for full node scans.

```bash
# Run analysis (requires ts-node)
npx ts-node server/src/db/optimization/analysis.ts
```

### 2. Index Advisor

The `GraphIndexAdvisorService` runs in the background (sampled) and records query patterns.
To apply recommendations:

```bash
# Apply recommended indexes
npx ts-node server/src/scripts/apply_indexes.ts
```

### 3. Caching Helper

Use the `withCache` higher-order function in resolvers.

```typescript
import { withCache, listCacheKey } from '../../utils/cacheHelper';

export const resolvers = {
  Query: {
    entities: withCache(
      (parent, args, context) => listCacheKey('entities', { ...args, tenantId: context.tenantId }),
      async (parent, args, context) => { ... },
      { ttl: 60, tenantId: 'context' }
    )
  }
}
```

## Common Pitfalls

- **N+1 Queries**: Use `DataLoader` (already integrated in context) instead of fetching related nodes in a loop.
- **Missing Indexes**: Always ensure `id` and `tenantId` are indexed for every label.
- **Cartesian Products**: Avoid disconnected patterns in `MATCH` clauses.
- **Large Result Sets**: Always use `SKIP` and `LIMIT`.

## Super-Node Mitigation (Relationship Bucketing)

High-degree nodes (10k+ relationships) should be routed through bucket nodes to prevent planner blowups and memory pressure.

```cypher
// Create bucketed relationships (write path)
MATCH (p:Person {id: $personId})
MERGE (p)-[:IN_BUCKET {facet: 'knows', range: $range}]->(b:Bucket {id: $bucketId, range: $range})
MERGE (b)-[:CONTAINS]->(f:Person {id: $friendId});

// Query within a bounded bucket (read path)
MATCH (p:Person {id: $personId})-[:IN_BUCKET {facet: 'knows', range: $range}]->(b:Bucket)
MATCH (b)-[:CONTAINS]->(f:Person)
RETURN f LIMIT 200;
```

- Index `Bucket(id)`, `Bucket(range)`, and composite `(facet, range)` to keep lookups constant time.
- Enforce a **max bucket size** (e.g., 1,000 relationships) and rollover to a new bucket when full.
- Add nightly compaction to rebalance buckets and drop cold buckets for storage/plan stability.
- Keep a feature flag (e.g., `useBuckets=true`) to roll out bucketed traversals per-tenant.

## Troubleshooting

- **High Latency**: Check `neo4j_query_latency_ms` metric. Identify specific slow operations.
- **Connection Timeouts**: Check `neo4j_active_connections`. Increase pool size if consistently full.
- **Cache Misses**: Check cache metrics. Adjust TTL or key generation strategy.
