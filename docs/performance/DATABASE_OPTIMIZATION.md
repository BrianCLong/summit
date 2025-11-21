# Database Optimization and Performance Guidelines

This document outlines the database optimization strategies, caching mechanisms, and performance best practices for the IntelGraph platform.

## Table of Contents

- [Overview](#overview)
- [PostgreSQL Optimization](#postgresql-optimization)
- [Neo4j Optimization](#neo4j-optimization)
- [Redis Caching Strategy](#redis-caching-strategy)
- [Query Pagination](#query-pagination)
- [DataLoader for N+1 Prevention](#dataloader-for-n1-prevention)
- [Database Monitoring](#database-monitoring)
- [Performance Goals](#performance-goals)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

The IntelGraph platform uses a polyglot persistence architecture:

- **PostgreSQL**: Canonical data store, ACID transactions, structured data
- **Neo4j**: Graph relationships, traversal queries, pattern matching
- **Redis**: Caching layer, session storage, pub/sub messaging
- **TimescaleDB**: Time-series data, event tracking

### Performance Targets

- **Query Response Time**: <100ms for 90th percentile
- **Cache Hit Rate**: >90% for frequently accessed data
- **Database Pool Utilization**: <80% under normal load
- **N+1 Query Prevention**: 100% via DataLoader

## PostgreSQL Optimization

### Connection Pooling

Optimized connection pool configuration (see `config/postgresql.ts`):

```typescript
{
  min: 5,              // Minimum connections
  max: 20,             // Maximum connections
  idleTimeoutMillis: 30000,     // 30 seconds
  connectionTimeoutMillis: 5000, // 5 seconds
  statementTimeout: 30000        // 30 seconds
}
```

**Best Practices:**
- Use read replicas for read-heavy workloads
- Monitor pool utilization via Prometheus metrics
- Adjust pool size based on concurrent request volume
- Use prepared statements for frequently executed queries

### Composite Indexes

Composite indexes for common query patterns (see `migrations/add-performance-indexes.sql`):

```sql
-- Example: Tenant + Type queries
CREATE INDEX idx_entities_tenant_type ON entities (tenant_id, type);

-- Example: Tenant + Time range queries
CREATE INDEX idx_entities_tenant_created ON entities (tenant_id, created_at DESC);

-- Example: Filtered queries
CREATE INDEX idx_entities_type_confidence ON entities (type, confidence)
WHERE confidence > 0.5;
```

**Index Strategy:**
- Always index tenant_id for multi-tenant isolation
- Create composite indexes for common WHERE combinations
- Use partial indexes for frequently filtered subsets
- Index foreign keys used in JOINs
- Use CONCURRENTLY to avoid blocking writes

### Query Optimization

**Slow Query Detection:**
```typescript
// Queries >100ms are logged automatically
const slowQueryThreshold = 100; // milliseconds
```

**Query Monitoring:**
```sql
-- Enable pg_stat_statements for query analysis
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Find slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC
LIMIT 10;
```

**Optimization Techniques:**
1. Use `EXPLAIN ANALYZE` to understand query plans
2. Prefer `EXISTS` over `COUNT(*)` for existence checks
3. Use pagination for large result sets
4. Avoid `SELECT *`, specify only needed columns
5. Use prepared statements for parameterized queries
6. Batch INSERT/UPDATE operations when possible

### Example Optimized Query

```typescript
// Bad: N+1 queries
for (const entity of entities) {
  const relationships = await db.query(
    'SELECT * FROM relationships WHERE source_id = $1',
    [entity.id]
  );
}

// Good: Single batch query
const entityIds = entities.map(e => e.id);
const relationships = await db.query(
  'SELECT * FROM relationships WHERE source_id = ANY($1)',
  [entityIds]
);
```

## Neo4j Optimization

### Connection Pooling

Neo4j driver configuration (see `config/neo4j.ts`):

```typescript
{
  maxConnectionPoolSize: 50,
  connectionAcquisitionTimeout: 60000,  // 60 seconds
  maxTransactionRetryTime: 30000,       // 30 seconds
  connectionTimeout: 30000              // 30 seconds
}
```

### Indexes and Constraints

See `migrations/add-neo4j-indexes.cypher` for complete index definitions.

**Key Indexes:**
```cypher
// Composite indexes for common patterns
CREATE INDEX idx_entity_tenant_type FOR (e:Entity) ON (e.tenantId, e.type);

// Full-text search
CREATE FULLTEXT INDEX entity_name_fulltext FOR (e:Entity) ON EACH [e.name];

// Range indexes for numeric properties
CREATE RANGE INDEX idx_entity_confidence_range FOR (e:Entity) ON (e.confidence);
```

**Constraints:**
```cypher
// Uniqueness
CREATE CONSTRAINT constraint_entity_id FOR (e:Entity) REQUIRE e.id IS UNIQUE;

// Node keys (composite uniqueness + existence)
CREATE CONSTRAINT constraint_entity_tenant_id FOR (e:Entity)
REQUIRE (e.id, e.tenantId) IS NODE KEY;

// Existence
CREATE CONSTRAINT constraint_entity_has_tenant FOR (e:Entity)
REQUIRE e.tenantId IS NOT NULL;
```

### Query Optimization

**Always filter by tenant first:**
```cypher
// Good: Uses idx_entity_tenant_type
MATCH (e:Entity {tenantId: $tenantId, type: $type})
RETURN e

// Bad: Full scan
MATCH (e:Entity {type: $type})
WHERE e.tenantId = $tenantId
RETURN e
```

**Use PROFILE/EXPLAIN:**
```cypher
// Analyze query performance
PROFILE MATCH (e:Entity {tenantId: $tenantId})
WHERE e.confidence > 0.8
RETURN e
ORDER BY e.createdAt DESC
LIMIT 100
```

**Optimization Tips:**
1. Use parameters ($param) instead of string concatenation
2. Limit traversal depth with relationship hop limits
3. Use `WITH` to pipeline complex queries
4. Avoid Cartesian products (multiple unconnected MATCHes)
5. Use `LIMIT` for large result sets
6. Consider using `apoc` procedures for complex operations

### Query Result Caching

```typescript
import { Neo4jQueryCache } from '../config/neo4j';

const cache = new Neo4jQueryCache(1000, 300000); // 1000 items, 5min TTL

// Check cache first
const cached = cache.get(cypher, params);
if (cached) return cached;

// Execute query
const result = await session.run(cypher, params);

// Cache result
cache.set(cypher, params, result);
```

## Redis Caching Strategy

### Cache TTL Configuration

See `config/redis.ts` for complete implementation.

```typescript
export const CACHE_TTL = {
  GRAPHQL_QUERY: 300,      // 5 minutes
  USER_SESSION: 86400,     // 24 hours
  GRAPH_METRICS: 3600,     // 1 hour
  ENTITY_DATA: 1800,       // 30 minutes
  RELATIONSHIP_DATA: 1800, // 30 minutes
  INVESTIGATION_DATA: 600, // 10 minutes
};
```

### Cache Prefixes

```typescript
export const CACHE_PREFIX = {
  GRAPHQL: 'gql',
  SESSION: 'session',
  METRICS: 'metrics',
  ENTITY: 'entity',
  RELATIONSHIP: 'rel',
  INVESTIGATION: 'inv',
};
```

### Caching Patterns

**1. GraphQL Query Caching:**
```typescript
import { RedisCacheManager, hashGraphQLQuery } from '../config/redis';

const queryHash = hashGraphQLQuery(query, variables);
const cached = await cacheManager.getGraphQLQuery(queryHash, tenantId);

if (!cached) {
  const result = await executeGraphQLQuery(query, variables);
  await cacheManager.cacheGraphQLQuery(queryHash, result, tenantId);
  return result;
}
return cached;
```

**2. User Session Caching:**
```typescript
// Store session
await cacheManager.cacheUserSession(sessionId, sessionData);

// Retrieve session
const session = await cacheManager.getUserSession(sessionId);

// Delete session
await cacheManager.deleteUserSession(sessionId);
```

**3. Graph Metrics Caching:**
```typescript
// Cache computed metrics
await cacheManager.cacheGraphMetrics('degree_centrality', metrics, tenantId);

// Retrieve cached metrics
const metrics = await cacheManager.getGraphMetrics('degree_centrality', tenantId);
```

### Cache Invalidation

**Automatic invalidation on mutations:**
```typescript
// In mutation resolvers
await cacheManager.invalidateOnMutation('entity', entityId, tenantId);
await cacheManager.invalidateOnMutation('relationship', relId, tenantId);
```

**Pattern-based invalidation:**
```typescript
// Invalidate all GraphQL queries for a tenant
await cacheManager.invalidateGraphQLQueries(tenantId);

// Invalidate all graph metrics
await cacheManager.invalidateGraphMetrics(tenantId);

// Invalidate by pattern
await cacheManager.deleteByPattern('gql:tenant123:*');
```

### Cache Monitoring

```typescript
// Get cache statistics
const stats = cacheManager.getAllStats();

// Get hit rate summary
const summary = cacheManager.getCacheHitRateSummary();
/*
{
  overall: { hits: 1000, misses: 100, hitRate: 0.909 },
  byPrefix: {
    gql: { hits: 800, misses: 50, hitRate: 0.941 },
    session: { hits: 200, misses: 50, hitRate: 0.800 }
  }
}
*/
```

## Query Pagination

### Cursor-Based Pagination

See `middleware/pagination.ts` for complete implementation.

**Default Limits:**
```typescript
{
  DEFAULT_PAGE_SIZE: 100,
  MAX_PAGE_SIZE: 1000,
  MIN_PAGE_SIZE: 1
}
```

**Usage in GraphQL:**
```typescript
import { createConnection, validatePaginationInput } from '../middleware/pagination';

const resolver = {
  entities: async (parent, args, context) => {
    const { first, after } = args;
    const { limit, isForward, cursor } = validatePaginationInput({ first, after });

    // Build query with cursor
    const entities = await fetchEntities(cursor, limit, isForward);

    // Create connection response
    return createConnection(entities, args, totalCount);
  }
};
```

**GraphQL Schema:**
```graphql
type EntityConnection {
  edges: [EntityEdge!]!
  pageInfo: PageInfo!
  totalCount: Int
}

type EntityEdge {
  node: Entity!
  cursor: String!
}

type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
  totalCount: Int
}

type Query {
  entities(first: Int, after: String, last: Int, before: String): EntityConnection!
}
```

**PostgreSQL Pagination:**
```typescript
import { PostgresCursorPagination } from '../middleware/pagination';

const { where, params } = PostgresCursorPagination.buildWhereClause(cursor, isForward);
const orderBy = PostgresCursorPagination.buildOrderClause(isForward);
const limit = PostgresCursorPagination.buildLimitClause(pageSize);

const query = `
  SELECT * FROM entities
  WHERE ${where} AND tenant_id = $2
  ${orderBy}
  ${limit}
`;
```

**Neo4j Pagination:**
```typescript
import { Neo4jCursorPagination } from '../middleware/pagination';

const { where, params } = Neo4jCursorPagination.buildWhereClause(cursor, isForward);
const orderBy = Neo4jCursorPagination.buildOrderClause(isForward);
const limit = Neo4jCursorPagination.buildLimitClause(pageSize);

const cypher = `
  MATCH (e:Entity {tenantId: $tenantId})
  WHERE ${where}
  RETURN e
  ${orderBy}
  ${limit}
`;
```

## DataLoader for N+1 Prevention

See `middleware/dataloader.ts` for complete implementation.

### What is the N+1 Problem?

```typescript
// BAD: N+1 queries
const entities = await getEntities(); // 1 query
for (const entity of entities) {
  entity.relationships = await getRelationships(entity.id); // N queries
}
// Total: 1 + N queries

// GOOD: With DataLoader
const entities = await getEntities(); // 1 query
const relationships = await Promise.all(
  entities.map(e => loaders.entityRelationshipsLoader.load(e.id))
); // 1 batched query
// Total: 2 queries
```

### Setting Up DataLoaders

**In GraphQL context:**
```typescript
import { createDataLoaders } from '../middleware/dataloader';

const context = ({ req }) => ({
  loaders: createDataLoaders(postgresPool, neo4jDriver, req.user?.tenantId),
  user: req.user,
});
```

**In Resolvers:**
```typescript
const resolvers = {
  Entity: {
    relationships: async (parent, args, context) => {
      // DataLoader batches all relationship queries
      return context.loaders.entityRelationshipsLoader.load(parent.id);
    },
  },

  Query: {
    entities: async (parent, args, context) => {
      // Batch load multiple entities
      return Promise.all(
        args.ids.map(id => context.loaders.entityLoader.load(id))
      );
    },
  },
};
```

### Available DataLoaders

```typescript
interface DataLoaderContext {
  loaders: {
    entityLoader: DataLoader<string, Entity | null>;
    relationshipLoader: DataLoader<string, Relationship | null>;
    investigationLoader: DataLoader<string, Investigation | null>;
    entityRelationshipsLoader: DataLoader<string, Relationship[]>;
  };
}
```

### DataLoader Configuration

```typescript
export const DEFAULT_DATALOADER_OPTIONS = {
  cache: true,              // Enable per-request caching
  maxBatchSize: 100,        // Maximum items per batch
  batchScheduleFn: (cb) => setTimeout(cb, 10), // 10ms batching window
};
```

## Database Monitoring

See `middleware/database-monitoring.ts` for complete implementation.

### Prometheus Metrics

**PostgreSQL Metrics:**
- `postgres_query_duration_seconds` - Query latency histogram
- `postgres_query_total` - Total queries counter
- `postgres_slow_query_total` - Slow queries (>100ms)
- `postgres_pool_size` - Connection pool size
- `postgres_pool_idle` - Idle connections
- `postgres_pool_waiting` - Waiting clients

**Neo4j Metrics:**
- `neo4j_query_duration_seconds` - Query latency histogram
- `neo4j_query_total` - Total queries counter
- `neo4j_slow_query_total` - Slow queries (>100ms)

**Redis Cache Metrics:**
- `redis_cache_hits_total` - Cache hits counter
- `redis_cache_misses_total` - Cache misses counter
- `redis_cache_hit_rate` - Hit rate gauge (0-1)
- `redis_cache_size_bytes` - Cache size estimate

**DataLoader Metrics:**
- `dataloader_batch_size` - Batch size histogram
- `dataloader_cache_hit_rate` - Cache hit rate

### Setting Up Monitoring

```typescript
import { databaseHealthMonitor } from '../middleware/database-monitoring';

// Monitor PostgreSQL pool
databaseHealthMonitor.monitorPostgresPool(postgresPool, 'write');

// Get health report
const report = databaseHealthMonitor.getHealthReport();
/*
{
  postgres: {
    pool: { total: 20, idle: 15, waiting: 0, utilization: 0.25 },
    slowQueries: [...]
  },
  cache: {
    gql: { hits: 800, misses: 50, hitRate: 0.941 },
    session: { hits: 200, misses: 50, hitRate: 0.800 }
  }
}
*/
```

### Health Check Endpoint

```typescript
import { handleHealthCheck } from '../middleware/database-monitoring';

app.get('/health/database', handleHealthCheck);
```

### Query Performance Tracking

```typescript
const tracker = databaseHealthMonitor.getQueryTracker();

// Track query execution
const start = Date.now();
const result = await pool.query(sql, params);
const duration = Date.now() - start;

tracker.trackQuery('postgres', sql, duration, {
  queryType: 'SELECT',
  table: 'entities',
  operation: 'read',
  status: 'success',
});

// Get slow query report
const slowQueries = tracker.getSlowQueryReport(10);
```

## Performance Goals

### Target Metrics

| Metric | Target | Current Baseline |
|--------|--------|-----------------|
| Query Response Time (p90) | <100ms | TBD |
| Query Response Time (p99) | <500ms | TBD |
| Cache Hit Rate | >90% | TBD |
| Database Pool Utilization | <80% | TBD |
| N+1 Queries | 0 | TBD |
| Slow Query Rate | <1% | TBD |

### Load Testing

Use the following tools for load testing:

```bash
# PostgreSQL load test
pgbench -c 10 -j 2 -t 10000 intelgraph_dev

# Neo4j load test (custom script recommended)
# Use Cypher queries with concurrent sessions

# Redis load test
redis-benchmark -h localhost -p 6379 -c 50 -n 100000
```

### Performance Monitoring Dashboard

Create Grafana dashboards with:
1. Query latency percentiles (p50, p90, p99)
2. Database pool utilization over time
3. Cache hit rate by type
4. Slow query count and trends
5. Error rates by database
6. Connection pool wait time

## Best Practices

### Query Optimization Checklist

- [ ] Always filter by `tenant_id` first in multi-tenant queries
- [ ] Use appropriate indexes for WHERE clauses
- [ ] Limit result sets with `LIMIT` clause
- [ ] Use pagination for large datasets
- [ ] Use DataLoader for batch operations
- [ ] Cache frequently accessed data
- [ ] Use prepared statements for security and performance
- [ ] Profile slow queries with EXPLAIN/PROFILE
- [ ] Avoid SELECT *, specify needed columns
- [ ] Use composite indexes for common query patterns

### Caching Guidelines

1. **Cache Aggressively**: Cache any data accessed >3 times
2. **Short TTLs for Mutable Data**: Use short TTLs for frequently changing data
3. **Invalidate on Write**: Always invalidate related caches on mutations
4. **Monitor Hit Rates**: Aim for >90% cache hit rate
5. **Tenant Isolation**: Always include tenant_id in cache keys

### Connection Pool Sizing

**Formula:** `pool_size = ((core_count * 2) + effective_spindle_count)`

For typical workload:
- **Write Pool**: 5-20 connections
- **Read Pool**: 20-60 connections
- **Neo4j Pool**: 30-50 connections

Adjust based on:
- Concurrent user count
- Average request duration
- Database server resources

### Index Maintenance

```sql
-- Analyze tables weekly
ANALYZE entities;

-- Reindex if fragmentation >30%
REINDEX TABLE entities;

-- Check index bloat
SELECT schemaname, tablename,
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## Troubleshooting

### High Query Latency

**Symptoms:** Queries taking >100ms

**Diagnosis:**
```sql
-- Find slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC;

-- Check missing indexes
SELECT schemaname, tablename, seq_scan, idx_scan
FROM pg_stat_user_tables
WHERE seq_scan > idx_scan;
```

**Solutions:**
1. Add appropriate indexes
2. Optimize query with EXPLAIN ANALYZE
3. Use pagination for large result sets
4. Enable query result caching
5. Consider read replicas for read-heavy workloads

### Low Cache Hit Rate

**Symptoms:** Cache hit rate <80%

**Diagnosis:**
```typescript
const summary = cacheManager.getCacheHitRateSummary();
console.log(summary);
```

**Solutions:**
1. Increase cache TTL for stable data
2. Pre-warm cache for common queries
3. Review cache invalidation logic
4. Increase Redis memory limit
5. Implement multi-tier caching

### Connection Pool Exhaustion

**Symptoms:** Clients waiting for connections

**Diagnosis:**
```typescript
const stats = databaseHealthMonitor.getHealthReport();
console.log(stats.postgres.pool);
```

**Solutions:**
1. Increase pool size (max: 20-50)
2. Reduce query duration (optimize queries)
3. Implement connection timeout
4. Add read replicas
5. Use connection pooler (PgBouncer)

### N+1 Query Problems

**Symptoms:** Excessive database queries per request

**Diagnosis:**
```bash
# Enable query logging
export POSTGRES_LOG_STATEMENT=all

# Count queries per request
grep "SELECT" postgres.log | wc -l
```

**Solutions:**
1. Use DataLoader for batch loading
2. Use JOIN queries instead of multiple SELECTs
3. Implement eager loading for relationships
4. Cache relationship data
5. Use GraphQL field-level DataLoaders

### Memory Issues

**Symptoms:** Redis running out of memory

**Diagnosis:**
```bash
redis-cli INFO memory
redis-cli --bigkeys
```

**Solutions:**
1. Implement LRU eviction policy
2. Reduce cache TTLs
3. Use cache size limits
4. Remove unused cache keys
5. Increase Redis memory allocation

## Migration Guide

### Applying Optimizations

1. **Apply PostgreSQL indexes:**
```bash
psql -U intelgraph -d intelgraph_dev -f migrations/add-performance-indexes.sql
```

2. **Apply Neo4j indexes:**
```bash
cypher-shell -u neo4j -p password < migrations/add-neo4j-indexes.cypher
```

3. **Configure connection pools:**
```typescript
import { createOptimizedPool } from './config/postgresql';
import { createOptimizedNeo4jDriver } from './config/neo4j';

const postgresPool = createOptimizedPool(config);
const neo4jDriver = createOptimizedNeo4jDriver(config);
```

4. **Enable caching:**
```typescript
import { createRedisCacheManager } from './config/redis';

const cacheManager = createRedisCacheManager(config);
```

5. **Add DataLoaders to GraphQL context:**
```typescript
import { createDataLoaders } from './middleware/dataloader';

const context = ({ req }) => ({
  loaders: createDataLoaders(postgresPool, neo4jDriver, req.user?.tenantId),
});
```

6. **Enable monitoring:**
```typescript
import { databaseHealthMonitor } from './middleware/database-monitoring';

databaseHealthMonitor.monitorPostgresPool(postgresPool);
app.get('/health/database', handleHealthCheck);
```

## Summary

This optimization guide implements:

✅ **Neo4j**: Connection pooling (50 max), query result caching, comprehensive indexes
✅ **PostgreSQL**: Optimized pooling (5 min, 20 max), composite indexes, slow query logging
✅ **Redis**: Multi-tier caching (GraphQL: 5min, Sessions: 24h, Metrics: 1h)
✅ **Pagination**: Cursor-based pagination with 100 item default limit
✅ **DataLoader**: Complete N+1 prevention for entities, relationships, investigations
✅ **Monitoring**: Prometheus metrics, health checks, slow query tracking
✅ **Migrations**: SQL and Cypher scripts for index creation
✅ **Documentation**: Comprehensive performance guidelines

**Expected Outcomes:**
- Query times <100ms for 90th percentile
- Cache hit rate >90%
- Zero N+1 queries via DataLoader
- Optimized database performance under load

For questions or issues, consult the troubleshooting section or reach out to the platform team.
