# Database Optimization Migration Guide

This guide will help you migrate your application to use the new database optimization features.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Step-by-Step Migration](#step-by-step-migration)
- [Breaking Changes](#breaking-changes)
- [Rollback Plan](#rollback-plan)
- [Troubleshooting](#troubleshooting)

## Overview

The database optimization package includes:

- **Neo4j Optimization**: Connection pooling, query caching, index management
- **PostgreSQL Optimization**: Composite indexes, connection pooling, slow query logging
- **Redis Caching**: GraphQL query caching, session management, metrics caching
- **DataLoader**: N+1 query prevention
- **Pagination**: Cursor-based pagination for GraphQL
- **Monitoring**: Comprehensive database and cache metrics

**Estimated Migration Time**: 2-4 hours
**Downtime Required**: None (can be done with rolling deployment)
**Risk Level**: Low (backwards compatible)

## Prerequisites

Before starting the migration, ensure you have:

- [ ] Node.js 18+ installed
- [ ] TypeScript 4.9+ configured
- [ ] All dependencies installed:
  ```bash
  # Check if dependencies exist
  npm list neo4j-driver pg ioredis pino dataloader prom-client
  ```
- [ ] Database access credentials
- [ ] Backup of production databases (recommended)
- [ ] Read the [Database Optimization Guide](./performance/DATABASE_OPTIMIZATION.md)

## Step-by-Step Migration

### Phase 1: Apply Database Indexes (30-60 minutes)

**⚠️ Important**: These migrations are **non-blocking** and can be run on production databases without downtime.

#### 1.1 PostgreSQL Indexes

```bash
# 1. Review the migration script
cat migrations/add-performance-indexes.sql

# 2. Test on development database first
psql -U intelgraph -d intelgraph_dev -f migrations/add-performance-indexes.sql

# 3. Verify indexes were created
psql -U intelgraph -d intelgraph_dev -c "\di"

# 4. Apply to production (using CONCURRENTLY, no locks)
psql -U intelgraph -d intelgraph_prod -f migrations/add-performance-indexes.sql
```

**Expected Output**:
```
CREATE INDEX
CREATE INDEX
...
✓ Performance indexes created successfully!
```

**Validation**:
```sql
-- Check index count
SELECT COUNT(*) FROM pg_indexes
WHERE schemaname = 'public' AND indexname LIKE 'idx_%';

-- Should show 40+ indexes
```

#### 1.2 Neo4j Indexes

```bash
# 1. Connect to Neo4j
cypher-shell -u neo4j -p your-password

# 2. Review indexes to be created
cat migrations/add-neo4j-indexes.cypher

# 3. Apply indexes (idempotent with IF NOT EXISTS)
cat migrations/add-neo4j-indexes.cypher | cypher-shell -u neo4j -p your-password

# 4. Verify indexes
SHOW INDEXES;
SHOW CONSTRAINTS;
```

**Expected Output**:
```
+--------------------+--------+----------+
| name               | type   | state    |
+--------------------+--------+----------+
| idx_entity_id      | BTREE  | ONLINE   |
| idx_entity_type    | BTREE  | ONLINE   |
...
+--------------------+--------+----------+
```

### Phase 2: Update Application Code (60-90 minutes)

#### 2.1 Update Database Connection Setup

**Before** (example from existing code):
```typescript
// server/src/db/neo4j.ts
import neo4j from 'neo4j-driver';

const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
);
```

**After** (using optimized configuration):
```typescript
import { createOptimizedNeo4jDriver } from '../config/neo4j';

const driver = createOptimizedNeo4jDriver({
  uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
  username: process.env.NEO4J_USER || 'neo4j',
  password: process.env.NEO4J_PASSWORD || 'password',
  maxConnectionPoolSize: 50,
  connectionTimeout: 30000,
  slowQueryThreshold: 100,
});
```

**Why**: Adds connection pooling, slow query detection, and better error handling.

#### 2.2 Add Redis Cache Manager

**New File**: `server/src/cache/manager.ts`
```typescript
import { createRedisCacheManager } from '../config/redis';

export const cacheManager = createRedisCacheManager({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  keyPrefix: 'intelgraph:',
  enableMetrics: true,
});

export default cacheManager;
```

#### 2.3 Add DataLoaders to GraphQL Context

**Before**:
```typescript
// server/src/graphql/context.ts
export const createContext = ({ req }) => ({
  user: req.user,
  db: {
    neo4j: getNeo4jDriver(),
    postgres: getPostgresPool(),
  },
});
```

**After**:
```typescript
import { createDataLoaders } from '../middleware/dataloader';
import cacheManager from '../cache/manager';

export const createContext = ({ req }) => {
  const tenantId = req.user?.tenantId;

  return {
    user: req.user,
    tenantId,
    // Add DataLoaders (prevents N+1 queries)
    loaders: createDataLoaders(
      getPostgresPool(),
      getNeo4jDriver(),
      tenantId
    ),
    // Add cache manager
    cacheManager,
    // Keep existing
    db: {
      neo4j: getNeo4jDriver(),
      postgres: getPostgresPool(),
    },
  };
};
```

**Why**: Enables N+1 query prevention and caching in resolvers.

#### 2.4 Update Resolvers to Use DataLoaders

**Before** (N+1 problem):
```typescript
Entity: {
  relationships: async (parent, args, context) => {
    // ❌ This creates N queries (one per entity)
    const result = await context.db.postgres.query(
      'SELECT * FROM relationships WHERE source_id = $1',
      [parent.id]
    );
    return result.rows;
  },
},
```

**After** (using DataLoader):
```typescript
Entity: {
  relationships: async (parent, args, context) => {
    // ✅ This batches all queries into one
    return context.loaders.entityRelationshipsLoader.load(parent.id);
  },
},
```

**Why**: Reduces database queries from N to 1, dramatically improving performance.

#### 2.5 Add GraphQL Query Caching

**Before**:
```typescript
Query: {
  entities: async (parent, args, context) => {
    const result = await context.db.postgres.query(
      'SELECT * FROM entities WHERE tenant_id = $1',
      [context.tenantId]
    );
    return result.rows;
  },
},
```

**After** (with caching):
```typescript
import { hashGraphQLQuery } from '../config/redis';

Query: {
  entities: async (parent, args, context) => {
    const cacheKey = hashGraphQLQuery('entities', args);

    // Check cache first
    const cached = await context.cacheManager.getGraphQLQuery(
      cacheKey,
      context.tenantId
    );
    if (cached) return cached;

    // Execute query
    const result = await context.db.postgres.query(
      'SELECT * FROM entities WHERE tenant_id = $1',
      [context.tenantId]
    );

    // Cache result
    await context.cacheManager.cacheGraphQLQuery(
      cacheKey,
      result.rows,
      context.tenantId
    );

    return result.rows;
  },
},
```

**Why**: Reduces database load by 90%+ for frequently accessed queries.

#### 2.6 Add Cache Invalidation to Mutations

**Critical**: Always invalidate caches when data changes!

```typescript
Mutation: {
  createEntity: async (parent, args, context) => {
    // Create entity
    const result = await context.db.postgres.query(
      'INSERT INTO entities (...) VALUES (...) RETURNING *',
      [...]
    );

    const entity = result.rows[0];

    // ✅ Invalidate related caches
    await context.cacheManager.invalidateOnMutation(
      'entity',
      entity.id,
      context.tenantId
    );

    // ✅ Clear DataLoader cache
    context.loaders.entityLoader.clear(entity.id);

    return entity;
  },
},
```

### Phase 3: Add Monitoring (30 minutes)

#### 3.1 Add Healthcheck Endpoints

**File**: `server/src/routes/health.ts`
```typescript
import express from 'express';
import { databaseHealthMonitor, handleHealthCheck } from '../middleware/database-monitoring';

const router = express.Router();

// Database health
router.get('/database', handleHealthCheck);

// Slow queries
router.get('/slow-queries', (req, res) => {
  const tracker = databaseHealthMonitor.getQueryTracker();
  res.json(tracker.getSlowQueryReport(20));
});

// Cache stats
router.get('/cache-stats', (req, res) => {
  const monitor = databaseHealthMonitor.getCacheMonitor();
  res.json(monitor.getStats());
});

export default router;
```

**Add to server**:
```typescript
import healthRoutes from './routes/health';

app.use('/health', healthRoutes);
```

#### 3.2 Start Monitoring

**File**: `server/src/index.ts`
```typescript
import { databaseHealthMonitor } from './middleware/database-monitoring';

// Start monitoring PostgreSQL pool
databaseHealthMonitor.monitorPostgresPool(postgresPool, 'write');

// Graceful shutdown
process.on('SIGTERM', () => {
  databaseHealthMonitor.stop();
});
```

### Phase 4: Test and Validate (30-60 minutes)

#### 4.1 Run Unit Tests

```bash
# Run all tests
npm test

# Run database tests specifically
npm test -- config/__tests__/neo4j.test.ts
```

#### 4.2 Test Locally

```bash
# Start local services
docker-compose up -d neo4j postgres redis

# Start server
npm run dev

# Test health endpoints
curl http://localhost:4000/health/database
curl http://localhost:4000/health/slow-queries
curl http://localhost:4000/health/cache-stats
```

#### 4.3 Validate Performance

**Before deployment, check**:

```bash
# Check cache hit rate (should be >50% after warmup)
curl http://localhost:4000/health/cache-stats | jq '.overall.hitRate'

# Check slow queries (should be <1% of total)
curl http://localhost:4000/health/slow-queries | jq '. | length'

# Check pool utilization (should be <80%)
curl http://localhost:4000/health/database | jq '.postgres.pool.utilization'
```

**Expected Metrics After 1 Hour**:
- Cache hit rate: >80%
- Slow query rate: <1%
- Pool utilization: <60%
- Average query time: <50ms

### Phase 5: Deploy to Production (30 minutes)

#### 5.1 Pre-Deployment Checklist

- [ ] All tests passing
- [ ] Indexes applied to production databases
- [ ] Environment variables configured:
  ```bash
  NEO4J_URI=bolt://production-neo4j:7687
  POSTGRES_HOST=production-postgres
  REDIS_HOST=production-redis
  NEO4J_LOG_LEVEL=info
  PG_SLOW_QUERY_THRESHOLD_MS=100
  ```
- [ ] Monitoring configured (Grafana dashboards ready)
- [ ] Rollback plan tested

#### 5.2 Deployment Steps

**Option A: Blue-Green Deployment** (Recommended)
```bash
# 1. Deploy to green environment
kubectl apply -f k8s/deployment-green.yaml

# 2. Wait for health checks
kubectl wait --for=condition=ready pod -l app=server,slot=green --timeout=300s

# 3. Verify metrics
curl https://green.api.example.com/health/database

# 4. Switch traffic
kubectl patch service api -p '{"spec":{"selector":{"slot":"green"}}}'

# 5. Monitor for 10 minutes, then decommission blue
```

**Option B: Rolling Deployment**
```bash
# 1. Deploy with rolling update
kubectl set image deployment/server server=new-image:tag

# 2. Monitor rollout
kubectl rollout status deployment/server

# 3. Verify health
kubectl exec -it deployment/server -- curl localhost:4000/health/database
```

#### 5.3 Post-Deployment Validation

**Monitor these metrics for 1 hour**:

```bash
# 1. Error rate (should not increase)
# 2. Response time p95 (should decrease by 20-50%)
# 3. Database connections (should be stable)
# 4. Cache hit rate (should climb to 80%+)
```

**Grafana Queries**:
```promql
# Cache hit rate
rate(redis_cache_hits_total[5m]) / (rate(redis_cache_hits_total[5m]) + rate(redis_cache_misses_total[5m]))

# Slow query rate
rate(postgres_slow_query_total[5m]) / rate(postgres_query_total[5m])

# Pool utilization
postgres_pool_size{pool_type="write"} - postgres_pool_idle{pool_type="write"}
```

## Breaking Changes

### None!

This migration is **fully backwards compatible**. The optimization features are opt-in and don't change existing behavior.

### Optional Breaking Changes (for best performance)

If you want to enforce best practices, consider:

1. **Require pagination for all list queries**:
   ```typescript
   // Enforce pagination
   if (!args.first && !args.last) {
     throw new Error('Pagination required: provide "first" or "last"');
   }
   ```

2. **Disable unbounded queries**:
   ```sql
   -- Add query timeout
   SET statement_timeout = '30s';
   ```

3. **Require cache invalidation in mutations**:
   ```typescript
   // Lint rule: mutations must call invalidateOnMutation()
   ```

## Rollback Plan

If you need to rollback:

### Step 1: Revert Application Code

```bash
# Git rollback
git revert HEAD
git push origin main

# Redeploy previous version
kubectl rollout undo deployment/server
```

### Step 2: Remove Indexes (Optional)

**Note**: Indexes don't hurt performance, so you can leave them. But if you want to remove them:

**PostgreSQL**:
```sql
-- Drop indexes with specific pattern
DO $$
DECLARE
    idx record;
BEGIN
    FOR idx IN
        SELECT indexname
        FROM pg_indexes
        WHERE schemaname = 'public'
        AND indexname LIKE 'idx_%'
    LOOP
        EXECUTE 'DROP INDEX IF EXISTS ' || idx.indexname;
    END LOOP;
END $$;
```

**Neo4j**:
```cypher
// List all indexes
SHOW INDEXES;

// Drop specific indexes
DROP INDEX idx_entity_id IF EXISTS;
DROP INDEX idx_entity_type IF EXISTS;
// ... repeat for each index
```

### Step 3: Verify Rollback

```bash
# Check application health
curl https://api.example.com/health

# Verify error rates are normal
# Verify response times are acceptable
```

## Troubleshooting

### Issue: High Memory Usage

**Symptom**: Redis memory usage is high

**Solution**:
```typescript
// Reduce cache sizes
const cacheManager = createRedisCacheManager({
  // ... other config
  maxMemoryPolicy: 'allkeys-lru', // Enable LRU eviction
});

// Reduce TTLs
CACHE_TTL.GRAPHQL_QUERY = 60; // 1 minute instead of 5
```

### Issue: Cache Hit Rate is Low

**Symptom**: Cache hit rate <50%

**Causes**:
1. TTLs too short
2. Not enough warmup time
3. High cache invalidation rate
4. Queries with unique parameters

**Solutions**:
```typescript
// 1. Increase TTLs for stable data
CACHE_TTL.ENTITY_DATA = 3600; // 1 hour

// 2. Pre-warm cache on startup
async function warmCache() {
  await cacheManager.cacheGraphQLQuery('popular-query-1', result, tenantId);
  // ...
}

// 3. Review invalidation logic
// Only invalidate what's actually affected
```

### Issue: Slow Queries Still Occurring

**Symptom**: `/health/slow-queries` shows many entries

**Solutions**:
```sql
-- 1. Verify indexes are being used
EXPLAIN ANALYZE
SELECT * FROM entities WHERE tenant_id = '...' AND type = '...';

-- Should show "Index Scan" not "Seq Scan"

-- 2. Update statistics
ANALYZE entities;

-- 3. Add missing index
CREATE INDEX CONCURRENTLY idx_custom ON entities(tenant_id, other_column);
```

### Issue: DataLoader Not Batching

**Symptom**: Still seeing N queries in logs

**Causes**:
1. DataLoader not in context
2. Using await in loops

**Solutions**:
```typescript
// ❌ Wrong - doesn't batch
for (const entity of entities) {
  entity.relationships = await context.loaders.entityRelationshipsLoader.load(entity.id);
}

// ✅ Correct - batches all loads
entities.forEach(entity => {
  entity.relationships = context.loaders.entityRelationshipsLoader.load(entity.id);
});
```

### Issue: Connection Pool Exhaustion

**Symptom**: "Connection pool exhausted" errors

**Solutions**:
```typescript
// 1. Increase pool size
const pool = createOptimizedPool({
  max: 30, // Increase from 20
});

// 2. Check for connection leaks
// Enable connection leak detection
PG_CONNECTION_LEAK_THRESHOLD_MS=10000

// 3. Reduce query times
// Add timeouts
statementTimeout: 10000, // 10 seconds
```

## Next Steps

After successful migration:

1. **Monitor Performance**:
   - Set up Grafana dashboards
   - Configure alerts for slow queries
   - Track cache hit rates

2. **Optimize Further**:
   - Review slow query reports weekly
   - Adjust cache TTLs based on usage
   - Add more indexes for common patterns

3. **Document Patterns**:
   - Share best practices with team
   - Update code review guidelines
   - Add linting rules for common issues

4. **Scale**:
   - Add read replicas if needed
   - Consider Redis cluster for high traffic
   - Implement query result pagination everywhere

## Support

If you encounter issues during migration:

1. Check the [troubleshooting section](#troubleshooting)
2. Review [DATABASE_OPTIMIZATION.md](./performance/DATABASE_OPTIMIZATION.md)
3. Check [integration examples](./examples/database-optimization-integration.ts)
4. Open an issue with:
   - Steps to reproduce
   - Error messages
   - Environment details
   - Relevant metrics

## Success Criteria

Migration is successful when:

- [ ] All tests passing
- [ ] No increase in error rates
- [ ] 20-50% reduction in p95 response times
- [ ] Cache hit rate >80% after 24 hours
- [ ] Slow query rate <1%
- [ ] Pool utilization <80%
- [ ] No connection leaks
- [ ] Monitoring dashboards show healthy metrics

**Congratulations!** Your application is now optimized for high performance!
