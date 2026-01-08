# @intelgraph/cache-core

Unified caching abstraction with L1 (in-memory) and L2 (Redis) tiers.

## Features

- **Multi-tier caching**: L1 (in-memory LRU) + L2 (Redis)
- **LRU eviction**: Byte-based size limits with automatic eviction
- **TTL support**: Configurable time-to-live for all entries
- **Tag-based invalidation**: Group related entries for batch invalidation
- **Pub/sub invalidation**: Cross-instance cache coherency via Redis pub/sub
- **Prometheus metrics**: Built-in observability
- **Stampede protection**: Inflight request deduplication
- **Graceful degradation**: Redis failures don't break the application

## Installation

```bash
pnpm add @intelgraph/cache-core
```

## Usage

### Basic Usage

```typescript
import { createCache, CacheTier } from "@intelgraph/cache-core";

const cache = createCache({
  namespace: "my-service",
  tiers: [CacheTier.L1, CacheTier.L2],
  defaultTtlSeconds: 300,
  metrics: true,
  l1: {
    maxBytes: 100 * 1024 * 1024, // 100MB
  },
  l2: {
    connection: {
      host: "localhost",
      port: 6379,
      password: "secret",
    },
  },
});

// Basic operations
await cache.set("key", { data: "value" });
const value = await cache.get<MyType>("key");
await cache.delete("key");
```

### Cache-Aside Pattern

```typescript
// Automatically handles cache miss, loader, and caching
const result = await cache.getOrSet(
  "expensive-key",
  async () => {
    return await expensiveOperation();
  },
  { ttlSeconds: 300 }
);
```

### Tag-Based Invalidation

```typescript
// Cache with tags
await cache.set("entity:123", entity, {
  tags: ["investigation:456", "tenant:abc"],
});
await cache.set("entity:124", entity2, {
  tags: ["investigation:456"],
});

// Invalidate all entries with a tag
await cache.invalidateByTag("investigation:456");
// Both entity:123 and entity:124 are now invalidated
```

### Pattern-Based Deletion

```typescript
// Delete all user-related cache entries
const deleted = await cache.deleteByPattern("user:*");
console.log(`Deleted ${deleted} entries`);
```

### Using an Existing Redis Client

```typescript
import Redis from "ioredis";

const redis = new Redis({
  /* your config */
});

const cache = createCache({
  namespace: "my-service",
  tiers: [CacheTier.L1, CacheTier.L2],
  l2: {
    client: redis, // Use existing client
  },
});
```

## Configuration

| Option                   | Type        | Default              | Description                 |
| ------------------------ | ----------- | -------------------- | --------------------------- |
| `namespace`              | string      | required             | Prefix for all cache keys   |
| `tiers`                  | CacheTier[] | [L1, L2]             | Which cache tiers to enable |
| `defaultTtlSeconds`      | number      | 300                  | Default TTL for entries     |
| `metrics`                | boolean     | true                 | Enable Prometheus metrics   |
| `l1.maxBytes`            | number      | 100MB                | Maximum L1 cache size       |
| `l2.connection`          | object      | -                    | Redis connection options    |
| `l2.client`              | Redis       | -                    | Existing Redis client       |
| `l2.invalidationChannel` | string      | 'cache:invalidation' | Pub/sub channel             |

## Metrics

The following Prometheus metrics are exposed:

- `cache_hits_total{namespace, tier}` - Total cache hits
- `cache_misses_total{namespace, tier}` - Total cache misses
- `cache_sets_total{namespace, tier}` - Total set operations
- `cache_deletes_total{namespace, tier}` - Total delete operations
- `cache_invalidations_total{namespace, type}` - Total invalidations
- `cache_entries_count{namespace, tier}` - Current entry count
- `cache_bytes_used{namespace, tier}` - Current bytes used
- `cache_operation_duration_seconds{namespace, tier, operation}` - Operation latency

## Best Practices

1. **Use appropriate TTLs**: Start conservative, tune based on hit rates
2. **Namespace your caches**: Use service name as namespace
3. **Tag related data**: Use tags for entities that change together
4. **Monitor hit rates**: Alert on low hit rates (< 50%)
5. **Set size limits**: Always configure `l1.maxBytes`
6. **Handle errors**: Cache failures are non-fatal, always have a fallback

## See Also

- [Caching Strategy Documentation](/docs/architecture/caching-strategy.md)
- [Advanced Caching Package](/packages/advanced-caching)
