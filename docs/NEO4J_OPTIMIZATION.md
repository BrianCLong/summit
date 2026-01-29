# Neo4j Query Optimization Guide

## Overview

This guide details the strategy and tools available for optimizing Neo4j queries in the IntelGraph platform.

## Optimization Strategy

1.  **Analysis**: Use `server/src/db/optimization/analysis.ts` to profile slow queries.
2.  **Indexing**: Use `GraphIndexAdvisorService` to identify missing indexes. Run `server/src/scripts/apply_indexes.ts` to apply them.
3.  **Vector Optimization**: Leverage Neo4j 2025.x native `VECTOR` types and vector indexes for semantic search.
4.  **Caching**: Use `withCache` helper in `server/src/utils/cacheHelper.ts` for read-heavy resolvers.
5.  **Monitoring**: Check the "Neo4j Performance" Grafana dashboard.

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

### 3. Native Vector Optimization (Neo4j 2025.01+)

#### Vector Type Constraints
Enforce vector dimensions and types to ensure index stability:

```cypher
CREATE CONSTRAINT node_embedding_integrity IF NOT EXISTS
FOR (n:Entity)
REQUIRE n.embedding IS :: VECTOR<FLOAT32>(1536);
```

#### Vector Search (Cypher 25)
Prefer native `vector.similarity` functions for exact nearest neighbor search, especially when combined with graph filters:

```cypher
MATCH (n:Entity)-[:MENTIONS]->(d:Document)
WHERE d.status = 'published'
RETURN n.id, vector.similarity.cosine(n.embedding, $queryVector) AS score
ORDER BY score DESC
LIMIT 10
```

#### Vector Indexes
For large-scale approximate nearest neighbor (ANN) search, use native vector indexes:

```cypher
CREATE VECTOR INDEX entity_embeddings IF NOT EXISTS
FOR (n:Entity) ON (n.embedding)
OPTIONS {
  indexConfig: {
    `vector.dimensions`: 1536,
    `vector.similarity_function`: 'cosine'
  }
};
```

### 4. Caching Helper
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

-   **N+1 Queries**: Use `DataLoader` (already integrated in context) instead of fetching related nodes in a loop.
-   **Missing Indexes**: Always ensure `id` and `tenantId` are indexed for every label.
-   **Cartesian Products**: Avoid disconnected patterns in `MATCH` clauses.
-   **Large Result Sets**: Always use `SKIP` and `LIMIT`.

## Troubleshooting

-   **High Latency**: Check `neo4j_query_latency_ms` metric. Identify specific slow operations.
-   **Connection Timeouts**: Check `neo4j_active_connections`. Increase pool size if consistently full.
-   **Cache Misses**: Check cache metrics. Adjust TTL or key generation strategy.
