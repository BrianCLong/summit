# Caching Best Practices for Summit/IntelGraph

> **Last Updated**: 2025-11-20
> **Audience**: Platform Engineers, Backend Developers
> **Related**: [CACHING_STRATEGY.md](./CACHING_STRATEGY.md)

## Table of Contents

1. [Quick Reference](#quick-reference)
2. [Core Principles](#core-principles)
3. [Cache Key Design](#cache-key-design)
4. [TTL Selection Guide](#ttl-selection-guide)
5. [Invalidation Strategies](#invalidation-strategies)
6. [Anti-Patterns to Avoid](#anti-patterns-to-avoid)
7. [Testing Caches](#testing-caches)
8. [Troubleshooting](#troubleshooting)

---

## Quick Reference

### ✅ Do This

```typescript
// ✅ Use tenant-isolated cache keys
const key = `entity:${tenantId}:${entityId}`;

// ✅ Implement cache-aside pattern with fallback
const data = await cache.get(key) || await database.query();

// ✅ Set appropriate TTLs
await cache.set(key, data, 300); // 5 minutes

// ✅ Invalidate on mutations
await cache.invalidateEntity(entityId, tenantId);

// ✅ Monitor cache hit rates
cacheHits.labels('redis', 'entity', tenantId).inc();

// ✅ Handle cache failures gracefully
try {
  await cache.set(key, data);
} catch (error) {
  logger.warn('Cache set failed, continuing...', error);
}
```

### ❌ Don't Do This

```typescript
// ❌ No tenant isolation (security vulnerability!)
const key = `entity:${entityId}`; // WRONG

// ❌ Blocking on cache failures
await cache.set(key, data); // No error handling

// ❌ Caching without TTL
await cache.set(key, data); // Will stay forever

// ❌ Sharing cache keys across tenants
const key = `entities:all`; // WRONG

// ❌ Caching unbounded result sets
const allEntities = await cache.get('all-entities'); // WRONG

// ❌ Ignoring cache misses in hot paths
const data = await cache.get(key);
// No fallback to database!
```

---

## Core Principles

### 1. Multi-Tenant Isolation

**CRITICAL**: Always include `tenantId` in cache keys to prevent data leakage.

```typescript
// ✅ CORRECT: Tenant-isolated
const getCacheKey = (prefix: string, id: string, tenantId: string): string => {
  return `${prefix}:${tenantId}:${id}`;
};

// ❌ WRONG: Not tenant-isolated
const getCacheKey = (prefix: string, id: string): string => {
  return `${prefix}:${id}`;
};
```

**Why?**
- Prevents cross-tenant data leakage
- Enables per-tenant cache invalidation
- Supports multi-tenancy compliance requirements

### 2. Cache-Aside Pattern

Always implement cache-aside (lazy loading) with fallback to source of truth.

```typescript
async function getEntity(entityId: string, tenantId: string): Promise<Entity> {
  const cacheKey = `entity:${tenantId}:${entityId}`;

  // 1. Check cache first
  const cached = await cache.get<Entity>(cacheKey);
  if (cached) {
    cacheHits.inc();
    return cached;
  }

  // 2. Cache miss - fetch from database
  cacheMisses.inc();
  const entity = await database.getEntity(entityId, tenantId);

  // 3. Store in cache for next time
  await cache.set(cacheKey, entity, CACHE_TTL.ENTITY_DATA);

  return entity;
}
```

### 3. Graceful Degradation

**Never let cache failures break your application.**

```typescript
async function cacheWithFallback<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number,
): Promise<T> {
  try {
    // Try cache first
    const cached = await cache.get<T>(key);
    if (cached) return cached;
  } catch (error) {
    logger.warn('Cache read failed, falling back to database', { key, error });
  }

  // Fetch from source
  const data = await fetcher();

  // Try to cache (fire and forget)
  cache.set(key, data, ttl).catch((error) => {
    logger.warn('Cache write failed, continuing...', { key, error });
  });

  return data;
}
```

### 4. Smart Invalidation

Balance consistency with performance through smart invalidation.

```typescript
// ✅ Invalidate on mutations
export const updateEntityResolver = async (parent, args, context) => {
  const { id, input } = args;
  const { tenantId } = context;

  // Update entity
  const entity = await entityService.update(id, input, tenantId);

  // Invalidate caches (cascading)
  await cacheInvalidationService.emit('entity:updated', {
    type: 'entity',
    operation: 'updated',
    id,
    tenantId,
  });

  return entity;
};
```

### 5. Observability-First

**Always instrument your caches.**

```typescript
import { cacheHits, cacheMisses, cacheLatency } from './metrics';

async function get<T>(key: string): Promise<T | null> {
  const startTime = Date.now();

  try {
    const value = await cache.get(key);

    // Record metrics
    const duration = Date.now() - startTime;
    cacheLatency.observe(duration / 1000);

    if (value) {
      cacheHits.inc();
    } else {
      cacheMisses.inc();
    }

    return value;
  } catch (error) {
    cacheErrors.inc();
    throw error;
  }
}
```

---

## Cache Key Design

### Key Structure

Use a consistent hierarchical structure:

```
{prefix}:{tenantId}:{resourceType}:{resourceId}:{variant}
```

### Examples

```typescript
// Entities
entity:{tenantId}:{entityId}
entity:{tenantId}:{entityId}:full
entity:{tenantId}:{entityId}:neighbors

// Relationships
rel:{tenantId}:{relationshipId}
rel:{tenantId}:{sourceId}:{targetId}

// Neighborhoods
nbhd:{tenantId}:{investigationId}:{entityId}:{radius}

// GraphQL queries
gql:{tenantId}:{queryHash}

// Metrics
metrics:{tenantId}:{metricName}
metrics:{tenantId}:investigation:{investigationId}
```

### Key Naming Rules

1. **Use colons (`:`) as delimiters**: Easy to parse and pattern match
2. **Put tenant ID second**: Enables pattern matching for tenant invalidation
3. **Be specific**: Include all relevant identifiers
4. **Keep keys short**: Redis stores keys in memory
5. **Use consistent casing**: Lowercase with underscores

```typescript
// ✅ GOOD
const key = `entity:${tenantId}:${entityId}:neighbors`;

// ❌ BAD
const key = `Entity-${tenantId}-${entityId}-NeighborsFullView`;
```

### Key Hashing for Long Keys

For very long keys (e.g., GraphQL queries), use hashing:

```typescript
import { createHash } from 'crypto';

function hashGraphQLQuery(query: string, variables?: any): string {
  const content = query + JSON.stringify(variables || {});
  return createHash('sha256').update(content).digest('hex').substring(0, 16);
}

const cacheKey = `gql:${tenantId}:${hashGraphQLQuery(query, variables)}`;
```

---

## TTL Selection Guide

### Decision Matrix

| Data Characteristic | Recommended TTL | Example |
|---------------------|-----------------|---------|
| **Immutable** (never changes) | 1 year | Static assets, versioned APIs |
| **Stable** (changes rarely) | 1-24 hours | User preferences, feature flags |
| **Semi-dynamic** (changes occasionally) | 10-60 minutes | Entity data, investigation metadata |
| **Dynamic** (changes frequently) | 1-10 minutes | Dashboard metrics, real-time stats |
| **Volatile** (changes constantly) | 30-60 seconds | Live cursors, online presence |
| **Computed** (expensive to generate) | 5-30 minutes | Graph analytics, GraphRAG answers |

### Implementation

```typescript
export const CACHE_TTL = {
  // Immutable data
  STATIC_ASSET: 31536000,      // 1 year

  // Stable data
  USER_SESSION: 86400,         // 24 hours
  USER_PREFERENCES: 86400,     // 24 hours
  FEATURE_FLAG: 900,           // 15 minutes

  // Semi-dynamic data
  ENTITY_DATA: 1800,           // 30 minutes
  RELATIONSHIP_DATA: 1800,     // 30 minutes
  INVESTIGATION_DATA: 600,     // 10 minutes

  // Dynamic data
  GRAPH_METRICS: 300,          // 5 minutes
  DASHBOARD_METRICS: 300,      // 5 minutes

  // Computed data
  NEIGHBORHOOD: 300,           // 5 minutes
  GRAPHRAG_ANSWER: 600,        // 10 minutes
  SIMILARITY_SEARCH: 3600,     // 1 hour

  // Volatile data
  ONLINE_PRESENCE: 60,         // 1 minute

  // Audit data
  AUDIT_LOG: 3600,             // 1 hour (append-only)
} as const;
```

### Adaptive TTL

Adjust TTL based on access patterns:

```typescript
class AdaptiveTTLManager {
  private accessCounts = new Map<string, number>();

  getTTL(cacheKey: string, baseTTL: number): number {
    const accessCount = this.accessCounts.get(cacheKey) || 0;

    // High-frequency access → longer TTL
    if (accessCount > 100) return baseTTL * 4;
    if (accessCount > 50) return baseTTL * 2;
    if (accessCount > 10) return baseTTL;

    // Low-frequency access → shorter TTL
    return baseTTL / 2;
  }
}
```

---

## Invalidation Strategies

### 1. Time-Based (TTL) Invalidation

**Use when**: Data staleness is acceptable, simple to implement

```typescript
// Set TTL on write
await cache.set(key, data, 300); // Expires in 5 minutes
```

**Pros**: Simple, automatic
**Cons**: May serve stale data

### 2. Mutation-Triggered Invalidation

**Use when**: Strong consistency required, complex dependencies

```typescript
// Invalidate on mutation
await cache.invalidateEntity(entityId, tenantId);
```

**Pros**: Immediate consistency
**Cons**: Complex dependency tracking

### 3. Pattern-Based Invalidation

**Use when**: Bulk invalidation needed, related data must be cleared

```typescript
// Invalidate all entities for a tenant
await cache.deleteByPattern(`entity:${tenantId}:*`);
```

**Pros**: Flexible, catches all related keys
**Cons**: Can over-invalidate, expensive SCAN operation

### 4. Event-Driven Invalidation

**Use when**: Distributed system, need to notify multiple cache layers

```typescript
// Emit event for cache invalidation
eventBus.emit('entity:updated', { entityId, tenantId });

// Listen and invalidate
eventBus.on('entity:updated', async ({ entityId, tenantId }) => {
  await cache.invalidateEntity(entityId, tenantId);
});
```

**Pros**: Decoupled, scalable
**Cons**: Eventual consistency, requires event bus

### 5. Write-Through Invalidation

**Use when**: Cache must always be in sync with database

```typescript
async function updateEntity(id: string, data: any, tenantId: string) {
  // Update database
  await database.update(id, data);

  // Update cache
  await cache.set(`entity:${tenantId}:${id}`, data, CACHE_TTL.ENTITY_DATA);
}
```

**Pros**: Always consistent
**Cons**: Slower writes, cache may be unused

---

## Anti-Patterns to Avoid

### 1. Cache Stampede

**Problem**: When cache expires, multiple requests hit the database simultaneously.

```typescript
// ❌ WRONG: No protection against stampede
async function getEntity(id: string) {
  const cached = await cache.get(id);
  if (!cached) {
    // 1000 requests hit this at the same time!
    return await database.getEntity(id);
  }
  return cached;
}
```

**Solution**: Use distributed locks

```typescript
// ✅ CORRECT: Distributed lock prevents stampede
import Redlock from 'redlock';

async function getEntity(id: string, tenantId: string) {
  const cacheKey = `entity:${tenantId}:${id}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  // Acquire lock
  const lockKey = `lock:${cacheKey}`;
  const lock = await redlock.lock(lockKey, 5000);

  try {
    // Double-check cache (another process may have filled it)
    const cached2 = await cache.get(cacheKey);
    if (cached2) return cached2;

    // Fetch and cache
    const data = await database.getEntity(id, tenantId);
    await cache.set(cacheKey, data, CACHE_TTL.ENTITY_DATA);
    return data;
  } finally {
    await lock.unlock();
  }
}
```

### 2. Unbounded Result Sets

**Problem**: Caching queries without LIMIT can consume all memory.

```typescript
// ❌ WRONG: No limit on result set
const allEntities = await cache.cacheAside('entities:all', async () => {
  return await database.query('SELECT * FROM entities'); // Could be millions!
});
```

**Solution**: Always paginate and cache pages

```typescript
// ✅ CORRECT: Cache paginated results
async function getEntitiesPage(page: number, pageSize: number, tenantId: string) {
  const cacheKey = `entities:${tenantId}:page:${page}:size:${pageSize}`;

  return await cache.cacheAside(cacheKey, async () => {
    return await database.query(
      'SELECT * FROM entities WHERE tenant_id = $1 LIMIT $2 OFFSET $3',
      [tenantId, pageSize, page * pageSize],
    );
  }, CACHE_TTL.ENTITY_DATA);
}
```

### 3. Caching Errors

**Problem**: Caching error states can mask issues.

```typescript
// ❌ WRONG: Caching null/error values
async function getEntity(id: string, tenantId: string) {
  return await cache.cacheAside(key, async () => {
    const entity = await database.getEntity(id, tenantId);
    return entity; // Could be null or throw error
  }, CACHE_TTL.ENTITY_DATA);
}
```

**Solution**: Only cache successful results

```typescript
// ✅ CORRECT: Don't cache errors
async function getEntity(id: string, tenantId: string) {
  const cacheKey = `entity:${tenantId}:${id}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  try {
    const entity = await database.getEntity(id, tenantId);

    // Only cache if entity exists
    if (entity) {
      await cache.set(cacheKey, entity, CACHE_TTL.ENTITY_DATA);
    }

    return entity;
  } catch (error) {
    // Don't cache errors
    logger.error('Failed to fetch entity', { id, error });
    throw error;
  }
}
```

### 4. Synchronous Cache Warming

**Problem**: Blocking user requests while warming cache.

```typescript
// ❌ WRONG: User waits for cache warming
router.get('/investigation/:id', async (req, res) => {
  await cacheWarmingService.warmInvestigation(req.params.id); // Blocks!
  const investigation = await getInvestigation(req.params.id);
  res.json(investigation);
});
```

**Solution**: Fire-and-forget cache warming

```typescript
// ✅ CORRECT: Asynchronous cache warming
router.get('/investigation/:id', async (req, res) => {
  // Fire and forget
  cacheWarmingService.warmInvestigation(req.params.id).catch((error) => {
    logger.warn('Cache warming failed', { error });
  });

  const investigation = await getInvestigation(req.params.id);
  res.json(investigation);
});
```

---

## Testing Caches

### Unit Tests

```typescript
describe('Entity Cache', () => {
  let cache: CacheService;

  beforeEach(() => {
    cache = new CacheService();
  });

  it('should cache entity data', async () => {
    const entityId = 'entity-123';
    const tenantId = 'tenant-456';
    const entity = { id: entityId, name: 'Test Entity' };

    // Set cache
    await cache.set(`entity:${tenantId}:${entityId}`, entity, 300);

    // Get from cache
    const cached = await cache.get(`entity:${tenantId}:${entityId}`);

    expect(cached).toEqual(entity);
  });

  it('should expire after TTL', async () => {
    const key = 'test:key';
    await cache.set(key, 'value', 1); // 1 second TTL

    // Wait for expiration
    await new Promise((resolve) => setTimeout(resolve, 1100));

    const cached = await cache.get(key);
    expect(cached).toBeNull();
  });

  it('should invalidate related caches on entity update', async () => {
    const entityId = 'entity-123';
    const tenantId = 'tenant-456';

    // Set caches
    await cache.set(`entity:${tenantId}:${entityId}`, { id: entityId }, 300);
    await cache.set(`gql:${tenantId}:query1`, { result: 'data' }, 300);

    // Invalidate
    await cacheInvalidationService.invalidateEntity(entityId, tenantId);

    // Check caches are cleared
    expect(await cache.get(`entity:${tenantId}:${entityId}`)).toBeNull();
    expect(await cache.get(`gql:${tenantId}:query1`)).toBeNull();
  });
});
```

### Integration Tests

```typescript
describe('Cache Integration', () => {
  it('should fall back to database on cache miss', async () => {
    const entityId = 'entity-123';
    const tenantId = 'tenant-456';

    // Clear cache
    await cache.delete(`entity:${tenantId}:${entityId}`);

    // Mock database
    const dbSpy = jest.spyOn(database, 'getEntity').mockResolvedValue({
      id: entityId,
      name: 'Test',
    });

    // Get entity (should hit database)
    const entity = await getEntity(entityId, tenantId);

    expect(dbSpy).toHaveBeenCalledWith(entityId, tenantId);
    expect(entity).toEqual({ id: entityId, name: 'Test' });

    // Second call should hit cache
    dbSpy.mockClear();
    await getEntity(entityId, tenantId);
    expect(dbSpy).not.toHaveBeenCalled();
  });
});
```

---

## Troubleshooting

### Low Cache Hit Rate (<70%)

**Symptoms**: High database load, slow response times

**Diagnosis**:
```bash
# Check cache hit rate
curl http://localhost:4000/metrics | grep cache_hits_total

# Check cache stats
curl http://localhost:4000/admin/cache/stats
```

**Solutions**:
1. Increase TTL for stable data
2. Implement cache warming for predictable access patterns
3. Check if invalidation is too aggressive
4. Verify cache keys are consistent

### High Cache Latency (>100ms p95)

**Symptoms**: Slow API responses despite high hit rate

**Diagnosis**:
```bash
# Check cache latency
curl http://localhost:4000/metrics | grep cache_operation_duration

# Check Redis metrics
redis-cli --latency-history
```

**Solutions**:
1. Use in-memory L1 cache for hot data
2. Optimize cache key size (shorter is better)
3. Use compression for large values
4. Check network latency to Redis
5. Consider Redis cluster for higher throughput

### Cache Stampede

**Symptoms**: Periodic database spikes, timeouts

**Diagnosis**:
```bash
# Monitor database connections during cache expiration
# Check for simultaneous identical queries
```

**Solutions**:
1. Implement distributed locks (see anti-patterns)
2. Use stale-while-revalidate pattern
3. Randomize TTL to spread out expirations
4. Implement cache warming before expiration

### Memory Exhaustion

**Symptoms**: Redis OOM errors, evictions

**Diagnosis**:
```bash
redis-cli INFO memory
redis-cli MEMORY STATS
```

**Solutions**:
1. Set maxmemory policy: `allkeys-lru`
2. Implement compression for large values
3. Reduce TTL for less critical data
4. Add more Redis memory or cluster
5. Audit cache keys for unbounded sets

---

## Checklist for New Cache Implementation

- [ ] Cache keys include `tenantId` for isolation
- [ ] Appropriate TTL set based on data characteristics
- [ ] Cache-aside pattern with database fallback
- [ ] Graceful error handling (cache failures don't break app)
- [ ] Invalidation strategy defined (mutation-triggered, TTL, or both)
- [ ] Prometheus metrics instrumented (hits, misses, latency)
- [ ] Unit tests for cache logic
- [ ] Integration tests for fallback behavior
- [ ] Load testing to verify cache performance
- [ ] Documentation updated with new cache keys
- [ ] Monitoring dashboard updated

---

## Additional Resources

- [CACHING_STRATEGY.md](./CACHING_STRATEGY.md) - Comprehensive caching strategy
- [Redis Best Practices](https://redis.io/docs/manual/patterns/)
- [Caching Patterns](https://docs.microsoft.com/en-us/azure/architecture/patterns/cache-aside)
- [Distributed Locks](https://redis.io/docs/manual/patterns/distributed-locks/)

---

**Questions or Feedback?**
- **Slack**: #platform-caching
- **Email**: platform-eng@intelgraph.com
- **On-Call**: PagerDuty rotation
