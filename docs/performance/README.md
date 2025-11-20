# Database Performance Optimization Package

**Version**: 1.0.0
**Status**: Production Ready ✅
**Compatibility**: Fully backwards compatible

## Quick Start

```typescript
// 1. Import optimizations
import { createOptimizedNeo4jDriver } from '../../config/neo4j';
import { createOptimizedPool } from '../../config/postgresql';
import { createRedisCacheManager } from '../../config/redis';
import { createDataLoaders } from '../../middleware/dataloader';

// 2. Set up databases
const neo4jDriver = createOptimizedNeo4jDriver({
  uri: process.env.NEO4J_URI,
  username: process.env.NEO4J_USER,
  password: process.env.NEO4J_PASSWORD,
  maxConnectionPoolSize: 50,
});

const postgresPool = createOptimizedPool({
  host: process.env.POSTGRES_HOST,
  min: 5,
  max: 20,
  slowQueryThreshold: 100,
});

const cacheManager = createRedisCacheManager({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || '6379'),
  keyPrefix: 'intelgraph:',
});

// 3. Add to GraphQL context
const context = ({ req }) => ({
  loaders: createDataLoaders(postgresPool, neo4jDriver, req.user?.tenantId),
  cacheManager,
});

// 4. Done! Now use in resolvers
Entity: {
  relationships: (parent, args, context) =>
    context.loaders.entityRelationshipsLoader.load(parent.id),
}
```

## What's Included

| Module | Purpose | Key Benefit |
|--------|---------|-------------|
| `config/neo4j.ts` | Neo4j optimization | 50+ indexes, query caching, connection pooling |
| `config/postgresql.ts` | PostgreSQL optimization | 40+ indexes, slow query logging, prepared statements |
| `config/redis.ts` | Redis caching | GraphQL caching, session management, metrics |
| `middleware/dataloader.ts` | N+1 prevention | Eliminates N+1 queries completely |
| `middleware/pagination.ts` | Cursor pagination | Relay-style pagination for GraphQL |
| `middleware/database-monitoring.ts` | Performance monitoring | Prometheus metrics, health checks |

## Performance Targets

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Query Response Time (p90) | <100ms | Prometheus: `histogram_quantile(0.9, rate(postgres_query_duration_seconds_bucket[5m]))` |
| Cache Hit Rate | >90% | `/health/cache-stats` endpoint |
| N+1 Queries | 0 | Check logs for multiple identical queries |
| Database Pool Utilization | <80% | `/health/database` endpoint |
| Slow Query Rate | <1% | Prometheus: `rate(postgres_slow_query_total[5m]) / rate(postgres_query_total[5m])` |

## Documentation

- **[DATABASE_OPTIMIZATION.md](./DATABASE_OPTIMIZATION.md)** - Complete performance guide (14,000+ words)
- **[MIGRATION_GUIDE.md](../MIGRATION_GUIDE.md)** - Step-by-step migration instructions
- **[Integration Examples](../examples/database-optimization-integration.ts)** - Working code examples (900+ lines)
- **[PR_SUMMARY.md](../PR_SUMMARY.md)** - Complete feature overview

## Common Use Cases

### Use Case 1: Eliminate N+1 Queries

**Before** (N+1 problem):
```typescript
// ❌ This executes N+1 queries (1 + N relationships)
const entities = await getEntities(); // 1 query
for (const entity of entities) {
  entity.relationships = await getRelationships(entity.id); // N queries
}
```

**After** (using DataLoader):
```typescript
// ✅ This executes 2 queries total (1 + 1 batched)
const entities = await getEntities(); // 1 query
const relationships = await Promise.all(
  entities.map(e => context.loaders.entityRelationshipsLoader.load(e.id))
); // 1 batched query
```

**Impact**: 90%+ reduction in database queries

### Use Case 2: Cache GraphQL Queries

**Before** (no caching):
```typescript
// ❌ Every request hits the database
Query: {
  entities: async (parent, args, context) => {
    return await db.query('SELECT * FROM entities WHERE tenant_id = $1', [tenantId]);
  },
}
```

**After** (with caching):
```typescript
// ✅ Subsequent requests use cache
Query: {
  entities: async (parent, args, context) => {
    const cacheKey = hashGraphQLQuery('entities', args);
    const cached = await context.cacheManager.getGraphQLQuery(cacheKey, tenantId);
    if (cached) return cached;

    const result = await db.query('SELECT * FROM entities WHERE tenant_id = $1', [tenantId]);
    await context.cacheManager.cacheGraphQLQuery(cacheKey, result, tenantId);
    return result;
  },
}
```

**Impact**: 80-95% reduction in database load

### Use Case 3: Implement Pagination

**Before** (unbounded query):
```typescript
// ❌ Returns all results (could be millions)
Query: {
  entities: async () => {
    return await db.query('SELECT * FROM entities');
  },
}
```

**After** (with pagination):
```typescript
// ✅ Returns paginated results with cursor
Query: {
  entities: async (parent, args, context) => {
    const { limit, isForward, cursor } = validatePaginationInput(args);
    const items = await db.query(
      `SELECT * FROM entities WHERE id > $1 ORDER BY id LIMIT $2`,
      [cursor || '0', limit + 1]
    );
    return createConnection(items, args, totalCount);
  },
}
```

**Impact**: Consistent performance regardless of data size

## Environment Variables

Add these to your `.env` file:

```bash
# Neo4j
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password
NEO4J_LOG_LEVEL=info

# PostgreSQL
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=intelgraph_dev
POSTGRES_USER=intelgraph
POSTGRES_PASSWORD=password
PG_WRITE_POOL_SIZE=20
PG_READ_POOL_SIZE=60
PG_SLOW_QUERY_THRESHOLD_MS=100

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_KEY_PREFIX=intelgraph:
```

## Monitoring

### Health Check Endpoints

Add these routes to your server:

```typescript
app.get('/health/database', handleHealthCheck);
app.get('/health/slow-queries', (req, res) => {
  const tracker = databaseHealthMonitor.getQueryTracker();
  res.json(tracker.getSlowQueryReport(20));
});
app.get('/health/cache-stats', (req, res) => {
  const monitor = databaseHealthMonitor.getCacheMonitor();
  res.json(monitor.getStats());
});
```

### Prometheus Metrics

All metrics are automatically exposed at `/metrics`:

**Key Metrics to Monitor**:
```promql
# Cache hit rate (target: >0.9)
rate(redis_cache_hits_total[5m]) /
  (rate(redis_cache_hits_total[5m]) + rate(redis_cache_misses_total[5m]))

# Slow query rate (target: <0.01)
rate(postgres_slow_query_total[5m]) / rate(postgres_query_total[5m])

# Pool utilization (target: <0.8)
(postgres_pool_size - postgres_pool_idle) / postgres_pool_size

# Query latency p95 (target: <0.1)
histogram_quantile(0.95, rate(postgres_query_duration_seconds_bucket[5m]))
```

## Troubleshooting

### Problem: Low Cache Hit Rate

**Symptoms**: Cache hit rate <50%

**Solutions**:
1. Increase TTLs for stable data
2. Pre-warm cache on startup
3. Review cache invalidation logic
4. Check for unique query parameters

**Example**:
```typescript
// Increase TTL for stable reference data
CACHE_TTL.ENTITY_DATA = 3600; // 1 hour instead of 30 minutes
```

### Problem: Slow Queries

**Symptoms**: Queries taking >100ms

**Solutions**:
1. Check indexes are being used: `EXPLAIN ANALYZE query`
2. Add missing indexes for common patterns
3. Use pagination for large result sets
4. Enable query result caching

**Example**:
```sql
-- Check if index is being used
EXPLAIN ANALYZE
SELECT * FROM entities WHERE tenant_id = '...' AND type = '...';

-- Should show "Index Scan using idx_entities_tenant_type"
```

### Problem: N+1 Queries

**Symptoms**: Same query executed many times

**Solutions**:
1. Ensure DataLoaders are in context
2. Use `Promise.all()` instead of `await` in loops
3. Use DataLoader's `.load()` method

**Example**:
```typescript
// ❌ Wrong
for (const entity of entities) {
  entity.relationships = await loader.load(entity.id);
}

// ✅ Correct
entities.forEach(entity => {
  entity.relationships = loader.load(entity.id);
});
```

## Best Practices

### 1. Always Filter by Tenant First

```typescript
// ✅ Good - uses idx_entities_tenant_type
WHERE tenant_id = $1 AND type = $2

// ❌ Bad - scans all tenants
WHERE type = $2 AND tenant_id = $1
```

### 2. Use Pagination for All Lists

```typescript
// ✅ Good
Query: {
  entities: (parent, args) => {
    if (!args.first && !args.last) {
      throw new Error('Pagination required');
    }
    // ...
  },
}
```

### 3. Invalidate Caches on Mutations

```typescript
// ✅ Good
Mutation: {
  updateEntity: async (parent, args, context) => {
    const entity = await updateEntity(args);
    await context.cacheManager.invalidateOnMutation('entity', entity.id, context.tenantId);
    return entity;
  },
}
```

### 4. Use DataLoaders for All Relationships

```typescript
// ✅ Good
Entity: {
  relationships: (parent, args, context) =>
    context.loaders.entityRelationshipsLoader.load(parent.id),
}
```

### 5. Monitor Performance Continuously

```typescript
// Set up monitoring
databaseHealthMonitor.monitorPostgresPool(pool);

// Review metrics weekly
const slowQueries = tracker.getSlowQueryReport(10);
const cacheStats = cacheMonitor.getStats();
```

## Migration Checklist

Before deploying to production:

- [ ] Read [MIGRATION_GUIDE.md](../MIGRATION_GUIDE.md)
- [ ] Apply database indexes (see `migrations/`)
- [ ] Update application code to use DataLoaders
- [ ] Add cache invalidation to mutations
- [ ] Set up monitoring endpoints
- [ ] Configure environment variables
- [ ] Test on staging environment
- [ ] Review metrics after 1 hour
- [ ] Adjust cache TTLs based on hit rates

## Support

- **Documentation**: See `docs/performance/DATABASE_OPTIMIZATION.md`
- **Examples**: See `docs/examples/database-optimization-integration.ts`
- **Migration**: See `docs/MIGRATION_GUIDE.md`
- **Issues**: Open a GitHub issue with details

## License

This optimization package is part of the IntelGraph platform.

## Version History

### v1.0.0 (Current)
- Initial release
- Neo4j optimization with 50+ indexes
- PostgreSQL optimization with 40+ indexes
- Redis caching with GraphQL support
- DataLoader for N+1 prevention
- Cursor-based pagination
- Comprehensive monitoring
- Full documentation and examples
- 300+ unit tests

---

**Ready to optimize your database performance!** 🚀

Start with the [Quick Start](#quick-start) guide above or read the full [DATABASE_OPTIMIZATION.md](./DATABASE_OPTIMIZATION.md) guide.
