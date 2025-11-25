# @summit/platform-cache

Unified caching abstraction for the Summit platform implementing **Prompt 20: Caching and Memoization Strategy**.

## Features

- **Multi-layer caching**: Local LRU cache + distributed Redis
- **Consistent key generation**: Type-safe key builder with hashing
- **TTL management**: Configurable default and max TTL
- **Cache invalidation**: Pattern-based and tag-based invalidation
- **Metrics collection**: Hit rate, latency, and size tracking
- **Memoization**: Easy function memoization with automatic caching
- **Type-safe**: Full TypeScript support with Zod validation

## Installation

```bash
pnpm add @summit/platform-cache
```

## Quick Start

```typescript
import { createCacheManager, SummitKeys } from '@summit/platform-cache';

// Create cache manager with configuration
const cache = createCacheManager({
  namespace: 'myapp',
  defaultTtl: 300, // 5 minutes
  local: {
    enabled: true,
    maxSize: 1000,
    ttl: 60, // 1 minute local cache
  },
  redis: {
    enabled: true,
    host: 'localhost',
    port: 6379,
  },
});

// Get cache client
const client = await cache.getClient();

// Basic operations
await client.set('user:123', { name: 'John', email: 'john@example.com' });
const user = await client.get('user:123');

// Get-or-set pattern (cache-aside)
const profile = await client.getOrSet('profile:123', async () => {
  // Fetch from database if not cached
  return await db.profiles.findById('123');
}, { ttl: 600 });

// Use predefined Summit keys
const entityKey = SummitKeys.entity('ent-456');
const searchKey = SummitKeys.search('test query', { type: 'person' });
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      CacheManager                           │
│  - Configuration validation (Zod)                          │
│  - Provider initialization                                  │
│  - Memoization factory                                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      CacheClient                            │
│  - Multi-layer get/set with fallback                       │
│  - TTL management and enforcement                          │
│  - Tag-based invalidation                                  │
│  - Metrics collection                                       │
└─────────────────────────────────────────────────────────────┘
           │                                    │
           ▼                                    ▼
┌──────────────────────┐         ┌──────────────────────────┐
│   MemoryProvider     │         │     RedisProvider        │
│  - LRU cache         │         │  - ioredis client        │
│  - Fast local hits   │         │  - Pattern deletion      │
│  - Limited capacity  │         │  - Cluster support       │
└──────────────────────┘         └──────────────────────────┘
```

## API Reference

### CacheManager

```typescript
import { createCacheManager, CacheManager } from '@summit/platform-cache';

const manager = createCacheManager({
  namespace: 'summit',
  defaultTtl: 300,
  maxTtl: 86400,
  enableMetrics: true,
  local: {
    enabled: true,
    maxSize: 1000,
    ttl: 60,
  },
  redis: {
    enabled: true,
    url: 'redis://localhost:6379',
    // or
    host: 'localhost',
    port: 6379,
    password: 'secret',
    db: 0,
    keyPrefix: 'cache:',
  },
});

// Get client
const client = await manager.getClient();

// Get statistics
const stats = manager.getStats();

// Close connections
await manager.close();
```

### CacheClient

```typescript
// Get value
const entry = await client.get<User>('user:123');
// Returns: { value: User, createdAt, expiresAt, source: 'local' | 'redis' | 'origin' }

// Set value
await client.set('user:123', userData, { ttl: 600 });

// Get or set (cache-aside pattern)
const entry = await client.getOrSet('user:123', fetchFromDb, { ttl: 600 });

// Check existence
const exists = await client.exists('user:123');

// Delete
const deleted = await client.delete('user:123');

// Invalidate by pattern
const count = await client.invalidatePattern('user:*');

// Invalidate by tags
await client.set('post:1', post, { tags: ['posts', 'user:123'] });
await client.invalidateByTags(['user:123']); // Invalidates all cached data tagged with user:123
```

### CacheKeyBuilder

```typescript
import { CacheKeyBuilder, SummitKeys } from '@summit/platform-cache';

// Manual key building
const key = new CacheKeyBuilder()
  .namespace('summit')
  .entity('user')
  .id('123')
  .action('profile')
  .build();
// Result: 'summit:user:123:profile'

// With hashing for complex data
const searchKey = new CacheKeyBuilder()
  .namespace('summit')
  .action('search')
  .hash({ query: 'test', filters: { status: 'active' } })
  .build();
// Result: 'summit:search:a1b2c3d4e5f67890'

// With time bucket (for time-based invalidation)
const key = new CacheKeyBuilder()
  .namespace('summit')
  .entity('stats')
  .timeBucket(3600) // 1-hour buckets
  .build();

// Predefined Summit keys
SummitKeys.entity('ent-123');           // 'summit:entity:ent-123'
SummitKeys.investigation('inv-456');    // 'summit:investigation:inv-456'
SummitKeys.relationships('ent-123', 3); // 'summit:entity:ent-123:relationships:<hash>'
SummitKeys.search('query', { filters }); // 'summit:search:<hash>'
SummitKeys.session('token');            // 'summit:session:<hash>'
SummitKeys.query('queryHash');          // 'summit:query:queryHash'
SummitKeys.traversal('start', 'pattern', 5); // 'summit:traversal:start:<hash>'
```

### Memoization

```typescript
const manager = createCacheManager();

// Memoize a function
const cachedFetch = manager.memoize(
  async (userId: string) => {
    return await db.users.findById(userId);
  },
  {
    keyPrefix: 'user',
    ttl: 300,
    keyGenerator: (userId) => userId, // Optional custom key generator
  }
);

// Use like a normal function
const user = await cachedFetch('123'); // Cached automatically
```

## Providers

### MemoryProvider

In-process LRU cache using `lru-cache`:

```typescript
import { MemoryProvider } from '@summit/platform-cache/providers';

const provider = new MemoryProvider({
  maxSize: 1000,    // Maximum entries
  ttl: 60000,       // Default TTL in milliseconds
});
```

### RedisProvider

Distributed cache using `ioredis`:

```typescript
import { RedisProvider } from '@summit/platform-cache/providers';

const provider = new RedisProvider({
  url: 'redis://localhost:6379',
  // or
  host: 'localhost',
  port: 6379,
  password: 'secret',
  db: 0,
  keyPrefix: 'cache:',
  maxRetriesPerRequest: 3,
  connectTimeout: 10000,
});

// Check availability
const available = await provider.isAvailable();

// Get underlying ioredis client
const redisClient = provider.getClient();
```

### NoOpProvider

Testing provider that does nothing:

```typescript
import { NoOpProvider } from '@summit/platform-cache/providers';

const provider = new NoOpProvider();
// All operations are no-ops, useful for testing
```

## Metrics

```typescript
const stats = manager.getStats();

console.log(stats);
// {
//   hits: 1500,
//   misses: 200,
//   hitRate: 88.24,
//   localHits: 1200,
//   redisHits: 300,
//   localSize: 847,
//   redisKeys: 15420,
//   avgGetLatency: 0.5,  // ms
//   avgSetLatency: 1.2,  // ms
// }
```

## Configuration

### Environment Variables

```bash
# Redis connection
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=secret
REDIS_DB=0

# Cache settings
CACHE_NAMESPACE=summit
CACHE_DEFAULT_TTL=300
CACHE_MAX_TTL=86400
CACHE_LOCAL_SIZE=1000
CACHE_LOCAL_TTL=60
```

### Zod Schema

```typescript
import { CacheConfigSchema } from '@summit/platform-cache';

// Validate configuration
const config = CacheConfigSchema.parse({
  namespace: 'myapp',
  defaultTtl: 300,
  // ... other options
});
```

## Testing

```typescript
import { createCacheManager, NoOpProvider } from '@summit/platform-cache';

// Use NoOp provider for unit tests
const testManager = createCacheManager({
  local: { enabled: false },
  redis: { enabled: false },
});

// Or mock the entire cache client
import { vi } from 'vitest';

const mockClient = {
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn().mockResolvedValue(undefined),
  getOrSet: vi.fn().mockImplementation((key, fn) => fn()),
};
```

## Best Practices

### 1. Use consistent key patterns

```typescript
// Good: Use SummitKeys for standard entities
const key = SummitKeys.entity(entityId);

// Good: Use CacheKeyBuilder for custom patterns
const key = new CacheKeyBuilder()
  .namespace('summit')
  .entity('custom')
  .id(id)
  .version(2)
  .build();

// Bad: Manual string concatenation
const key = `summit:entity:${entityId}`; // Inconsistent, error-prone
```

### 2. Use tags for related data invalidation

```typescript
// Cache with tags
await client.set(`post:${postId}`, post, {
  tags: ['posts', `user:${post.authorId}`, `category:${post.category}`],
});

// Invalidate all posts by user
await client.invalidateByTags([`user:${userId}`]);
```

### 3. Set appropriate TTLs

```typescript
// Static reference data - long TTL
await client.set('config:features', features, { ttl: 3600 });

// User session data - medium TTL
await client.set(`session:${token}`, session, { ttl: 900 });

// Real-time data - short TTL
await client.set(`stats:live`, stats, { ttl: 30 });
```

### 4. Handle cache failures gracefully

```typescript
try {
  const cached = await client.get('key');
  if (cached) return cached.value;
} catch (error) {
  // Log but don't fail
  console.warn('Cache read failed:', error);
}

// Always fall back to origin
return await fetchFromOrigin();
```

## License

MIT
