# Caching Strategy

> **Status**: Active
> **Last Updated**: 2025-12-06
> **Owner**: Platform Engineering

This document formalizes the caching strategy across the Summit/IntelGraph platform, defining what can be cached, where, for how long, and how it is invalidated.

---

## Table of Contents

1. [Overview](#overview)
2. [Caching Levels](#caching-levels)
3. [Data Classification](#data-classification)
4. [Invalidation Patterns](#invalidation-patterns)
5. [Implementation Guide](#implementation-guide)
6. [Observability](#observability)
7. [Security Considerations](#security-considerations)
8. [Troubleshooting](#troubleshooting)

---

## Overview

### Goals

- **Reduce latency**: Minimize response times for frequently-accessed data
- **Reduce load**: Decrease database and external API calls
- **Improve reliability**: Provide fallback when backends are slow/unavailable
- **Maintain consistency**: Ensure cached data doesn't become dangerously stale

### Principles

1. **Safety First**: Never cache user-sensitive or high-change data with long TTLs
2. **Explicit Over Implicit**: All caching must be intentional and documented
3. **Observable**: All caches must expose hit/miss metrics
4. **Degradable**: Cache failures must not break the application
5. **Bounded**: All caches must have size limits and TTLs

---

## Caching Levels

### L1: In-Memory (Application)

**Technology**: LRU Cache (via `lru-cache` or custom implementation)

| Property | Value                                                           |
| -------- | --------------------------------------------------------------- |
| Latency  | <1ms                                                            |
| Capacity | 1GB default (configurable via `L1_CACHE_MAX_BYTES`)             |
| TTL      | 300s default (configurable via `L1_CACHE_FALLBACK_TTL_SECONDS`) |
| Scope    | Per-instance (not shared across pods)                           |
| Eviction | LRU by byte size                                                |

**Use Cases**:

- Hot configuration data
- Session validation tokens
- Frequently-accessed entity metadata
- Computed values that are expensive to recalculate

**Limitations**:

- Not shared across instances
- Lost on restart
- Memory pressure concerns

### L2: Distributed (Redis)

**Technology**: Redis 7.x via ioredis

| Property | Value                                                                 |
| -------- | --------------------------------------------------------------------- |
| Latency  | 1-5ms                                                                 |
| Capacity | Configurable (default: available memory)                              |
| TTL      | Varies by data type (see [Data Classification](#data-classification)) |
| Scope    | Shared across all instances                                           |
| Eviction | TTL-based + Redis maxmemory-policy                                    |

**Use Cases**:

- Cross-instance session data
- GraphQL query results
- Entity/relationship lookups
- Rate limiting counters
- Neighborhood graph data

**Key Prefixes**:
| Prefix | Purpose | TTL |
|--------|---------|-----|
| `cache:` | General cache entries | Variable |
| `rate_limit:` | Rate limiting (DB 1) | Sliding window |
| `nbhd:` | Neighborhood graph cache | 1800s |
| `messages:room:` | WebSocket message persistence | 3600s |
| `presence:room:` | User presence tracking | 300s |
| `session:` | Session data | 86400s |

### L3: Edge (CDN)

**Technology**: CloudFront/CloudFlare (production only)

| Property     | Value                                |
| ------------ | ------------------------------------ |
| Latency      | 10-50ms (edge)                       |
| TTL          | Up to 31536000s for immutable assets |
| Scope        | Global edge network                  |
| Invalidation | API-based purge                      |

**Use Cases**:

- Static assets (JS, CSS, images)
- Public API responses (with Cache-Control headers)
- Immutable content (fingerprinted bundles)

### L4: Browser

**Technology**: HTTP Cache + Service Worker

| Property | Value                                |
| -------- | ------------------------------------ |
| TTL      | Controlled via Cache-Control headers |
| Scope    | Per-user, per-device                 |

**Headers Used**:

```
# Immutable static assets
Cache-Control: public, max-age=31536000, immutable

# Revalidation-based caching
Cache-Control: public, max-age=0, must-revalidate
ETag: "hash-of-content"

# No caching (GraphQL, user-specific)
Cache-Control: no-cache, no-store, must-revalidate
Pragma: no-cache
```

---

## Data Classification

### Safe to Cache (Long TTL)

| Data Type               | Max TTL | Invalidation     | Notes                |
| ----------------------- | ------- | ---------------- | -------------------- |
| Static assets           | 1 year  | Deploy-based     | Use content hashing  |
| Platform configuration  | 5 min   | On update        | Via pub/sub          |
| Entity type definitions | 5 min   | On schema change | Schema version check |
| Public API schemas      | 5 min   | Version-based    |                      |
| Feature flags           | 60s     | On toggle        | Poll or push         |

### Safe to Cache (Short TTL)

| Data Type               | Max TTL | Invalidation             | Notes             |
| ----------------------- | ------- | ------------------------ | ----------------- |
| Entity metadata         | 60s     | Write-through            | Entity ID as tag  |
| Investigation summaries | 30s     | Investigation change     |                   |
| Graph neighborhoods     | 30 min  | Node/relationship change |                   |
| Aggregated statistics   | 60s     | TTL-only                 | Approximate is OK |

### Avoid Caching

| Data Type               | Reason                 |
| ----------------------- | ---------------------- |
| User credentials        | Security risk          |
| Authentication tokens   | Security risk          |
| PII (names, emails)     | Privacy/compliance     |
| Audit logs              | Must be fresh          |
| Real-time notifications | Staleness unacceptable |
| Financial transactions  | Consistency critical   |

### Conditional Caching

| Data Type         | Condition          | TTL               |
| ----------------- | ------------------ | ----------------- |
| User preferences  | Per-user cache key | 5 min             |
| Permission grants | Session-scoped     | Until session end |
| Search results    | Query hash key     | 30s               |

---

## Invalidation Patterns

### 1. TTL-Based (Passive)

**When to Use**: Data that can be slightly stale

```typescript
await cache.set("key", value, { ttlSeconds: 300 });
```

**Pros**: Simple, automatic cleanup
**Cons**: Stale reads until expiry

### 2. Write-Through

**When to Use**: Critical data that must be fresh after writes

```typescript
// On write
await database.update(entity);
await cache.set(`entity:${entity.id}`, entity);
```

**Pros**: Immediate consistency
**Cons**: Write latency increase

### 3. Write-Behind (Async)

**When to Use**: High-write scenarios where slight delay is acceptable

```typescript
// On write
await database.update(entity);
queue.publish("cache:invalidate", { key: `entity:${entity.id}` });
```

**Pros**: Lower write latency
**Cons**: Brief inconsistency window

### 4. Tag-Based Invalidation

**When to Use**: Related data that should invalidate together

```typescript
// On write
await cache.set("entity:123", entity, { tags: ["investigation:456"] });

// On investigation update
await cache.invalidateByTag("investigation:456");
```

**Pros**: Batch invalidation
**Cons**: Tag index overhead

### 5. Pub/Sub Invalidation

**When to Use**: Multi-instance consistency

```typescript
// On write
redis.publish(
  "cache:invalidation",
  JSON.stringify({
    type: "key",
    keys: ["entity:123"],
  })
);

// All instances subscribe and evict local L1 cache
```

**Pros**: Cross-instance consistency
**Cons**: Network overhead, message ordering

---

## Implementation Guide

### Using the Shared Cache Abstraction

All services should use `@intelgraph/cache-core` for consistent caching:

```typescript
import { createCache, CacheTier } from "@intelgraph/cache-core";

// Create a cache instance
const cache = createCache({
  namespace: "my-service",
  tiers: [CacheTier.L1, CacheTier.L2],
  defaultTtlSeconds: 300,
  metrics: true,
});

// Basic operations
const value = await cache.get<MyType>("key");
await cache.set("key", value, { ttlSeconds: 60 });
await cache.delete("key");

// Cache-aside pattern with stampede protection
const result = await cache.getOrSet(
  "key",
  async () => {
    return await expensiveOperation();
  },
  { ttlSeconds: 300 }
);

// Tag-based invalidation
await cache.set("entity:123", entity, {
  tags: ["investigation:456", "tenant:abc"],
});
await cache.invalidateByTag("investigation:456");
```

### Adding Caching to a New Service

1. **Identify cacheable data**: Use [Data Classification](#data-classification)
2. **Choose cache tiers**: L1 for hot data, L2 for shared data
3. **Set appropriate TTLs**: Conservative first, tune later
4. **Add invalidation**: Prefer write-through for critical data
5. **Add metrics**: Use standard cache metrics
6. **Document**: Add to this strategy doc

### Caching Checklist

Before adding caching:

- [ ] Data is safe to cache (see classification)
- [ ] TTL is appropriate for data freshness requirements
- [ ] Cache has size bounds (maxSize or maxBytes)
- [ ] Invalidation strategy is defined
- [ ] Metrics are exposed
- [ ] Failure is graceful (fallback to source)
- [ ] Cache key includes tenant ID if multi-tenant
- [ ] No PII or credentials in cache

---

## Observability

### Required Metrics

All caches must expose these Prometheus metrics:

```
# Counter: cache operations by result
cache_hits_total{namespace, tier, operation}
cache_misses_total{namespace, tier, operation}
cache_sets_total{namespace, tier, operation}
cache_invalidations_total{namespace, pattern}

# Gauge: cache size
cache_entries_count{namespace, tier}
cache_bytes_used{namespace, tier}

# Histogram: operation latency
cache_operation_duration_seconds{namespace, tier, operation}
```

### Grafana Dashboard

A standard cache dashboard is available at `/d/cache-overview`:

- Hit rate by service/tier
- Cache size over time
- Latency percentiles
- Invalidation rate

### Alerting Rules

```yaml
# Low hit rate
- alert: CacheHitRateLow
  expr: rate(cache_hits_total[5m]) / (rate(cache_hits_total[5m]) + rate(cache_misses_total[5m])) < 0.5
  for: 10m
  labels:
    severity: warning

# Cache size approaching limit
- alert: CacheSizeHigh
  expr: cache_bytes_used / cache_bytes_limit > 0.9
  for: 5m
  labels:
    severity: warning
```

---

## Security Considerations

### What NOT to Cache

1. **Authentication credentials**: Passwords, API keys, tokens
2. **PII**: Names, emails, phone numbers, addresses
3. **Financial data**: Account numbers, transactions
4. **Audit data**: Must always read from source

### Cache Key Security

- Always include tenant ID in multi-tenant cache keys
- Use opaque hashes for user-specific cache keys
- Never include sensitive data in cache keys

```typescript
// BAD: Leaks email
const key = `user:${email}:preferences`;

// GOOD: Uses opaque ID
const key = `user:${userId}:preferences`;
```

### Redis Security

- Use authentication (REDIS_PASSWORD)
- Use TLS in production
- Separate Redis DB for rate limiting (isolation)
- Enable keyspace notifications selectively

---

## Troubleshooting

### Common Issues

#### Low Hit Rate

**Symptoms**: `cache_hits_total` much lower than `cache_misses_total`

**Causes**:

1. TTL too short for access pattern
2. Cache keys too specific (low reuse)
3. Cache size too small (excessive eviction)
4. High write rate causing invalidation

**Resolution**:

1. Analyze access patterns
2. Increase TTL if staleness is acceptable
3. Increase cache size
4. Review invalidation triggers

#### Memory Pressure

**Symptoms**: OOM errors, high memory usage

**Causes**:

1. L1 cache size unbounded
2. Large objects being cached
3. Memory leak in cache entries

**Resolution**:

1. Set `L1_CACHE_MAX_BYTES`
2. Add size limits per entry
3. Review cache cleanup intervals

#### Stale Data

**Symptoms**: Users see outdated information

**Causes**:

1. Missing invalidation on write
2. Pub/sub messages lost
3. TTL too long

**Resolution**:

1. Add write-through invalidation
2. Verify pub/sub subscription
3. Reduce TTL

### Debug Commands

```bash
# Check Redis cache keys
redis-cli KEYS "cache:*" | head

# Check cache size
redis-cli DBSIZE

# Monitor cache operations
redis-cli MONITOR | grep cache

# Check memory usage
redis-cli INFO memory
```

---

## References

- [Advanced Caching Package](/packages/advanced-caching)
- [Cache Core Package](/packages/cache-core)
- [Server Cache Service](/server/src/services/cacheService.ts)
- [Multi-Tier Cache](/server/src/lib/cache/multi-tier-cache.ts)

---

## Changelog

| Date       | Author        | Change                               |
| ---------- | ------------- | ------------------------------------ |
| 2025-12-06 | Platform Team | Comprehensive strategy formalization |
| 2024-XX-XX | Original      | Initial GraphQL caching notes        |
