# Policy-Aware Result Cache with Proofs

A production-ready caching service that incorporates policy context, user attributes, and data versioning into cache keys, with cryptographic proof generation for cache integrity.

## Features

- **Policy-Aware Caching**: Cache keys incorporate query hash, policy version, user ABAC attributes, and data snapshots
- **Cryptographic Proofs**: Every cache hit returns a signed proof bundle with provenance
- **Automatic Invalidation**: Cache invalidation on policy or data changes
- **Audit Trail**: Complete audit logging of cache operations
- **CLI Tools**: Inspect cache with `cache explain <key>`
- **Comprehensive Metrics**: Track hit rates, policy versions, and user patterns

## Architecture

### Cache Key Structure

```
<namespace>:<queryHash>:<paramsHash>:pol:<policyVersion>:<policyDigest>:usr:<userHash>:data:<snapshotId>
```

Example:
```
policy-cache:abc123:def456:pol:v1.2.0:hash123:usr:user456:data:snapshot-2024-01-01
```

### Proof Bundle

Every cached result includes a signed proof bundle:

```typescript
{
  cacheKey: string,
  queryHash: string,
  paramsHash: string,
  policyDigest: string,
  policyVersion: string,
  userSnapshot: {
    userId: string,
    rolesHash: string,
    attributesHash: string,
  },
  dataSnapshot: {
    snapshotId: string,
    timestamp: string,
    dataHash: string,
  },
  cachedAt: string,
  retrievedAt: string,
  ttl: number,
  signature: string,  // HMAC-SHA256 signature
  provenance?: {
    computedBy: string,
    computedAt: string,
    inputSources: string[],
  }
}
```

## Installation

```bash
pnpm install
```

## Usage

### As a Service

```typescript
import { PolicyAwareCacheService } from '@intelgraph/policy-aware-cache';

const cache = new PolicyAwareCacheService({
  redisUrl: 'redis://localhost:6379',
  databaseUrl: 'postgres://localhost:5432/intelgraph',
  namespace: 'my-app',
  defaultTTL: 3600,
  secretKey: process.env.CACHE_SECRET_KEY,
});

// Define cache key components
const components = {
  queryHash: hashQuery(query),
  paramsHash: hashParams(params),
  policyVersion: {
    version: 'v1.2.0',
    digest: 'abc123...',
    effectiveDate: '2024-01-01T00:00:00Z',
  },
  userAttributes: {
    userId: 'user-123',
    roles: ['analyst', 'viewer'],
    clearanceLevel: 'SECRET',
    organizationId: 'org-456',
  },
  dataSnapshot: {
    snapshotId: 'snapshot-2024-01-01',
    timestamp: '2024-01-01T00:00:00Z',
    dataHash: 'hash111...',
  },
};

// Try to get from cache
let result = await cache.get(components);

if (!result) {
  // Cache miss - compute result
  const data = await expensiveComputation(query, params);

  // Store in cache with proof
  result = await cache.set(components, data, {
    ttl: 3600,
    computedBy: 'analytics-engine',
    inputSources: ['neo4j://graph', 'postgres://table'],
  });
}

// Use cached data
console.log(result.data);

// Verify proof
const isValid = cache.verifyProof(result.proof);
console.log('Proof valid:', isValid);
```

### Cache Invalidation

```typescript
// Invalidate by policy change
await cache.invalidateByPolicy(
  oldPolicyVersion,
  newPolicyVersion,
  'admin-user'
);

// Invalidate by data snapshot change
await cache.invalidateByDataSnapshot(
  oldSnapshot,
  newSnapshot,
  'system'
);

// Manual invalidation by pattern
await cache.invalidate({
  type: 'manual',
  timestamp: new Date().toISOString(),
  reason: 'Data correction applied',
  keyPatterns: ['*:query-type-xyz:*'],
  initiatedBy: 'analyst-123',
});
```

### CLI Usage

```bash
# Explain a cache key
pnpm cli explain "policy-cache:abc123:def456:pol:v1.2.0:..."

# Show cache statistics
pnpm cli stats

# Verify proof signature
pnpm cli verify "policy-cache:abc123:..."

# Invalidate by pattern
pnpm cli invalidate "*:pol:v1.0.0:*" --reason "Policy deprecated"

# Clear all cache (requires --force)
pnpm cli clear --force
```

## Database Setup

Run the schema migration:

```bash
psql -d intelgraph -f src/db/schema.sql
```

Or use the migration script:

```bash
pnpm migrate
```

This creates:
- `cache_audit_log` - Tracks all cache access
- `cache_metadata` - Stores key component information
- `cache_invalidation_log` - Tracks invalidation events
- `policy_versions` - Policy change history
- `data_snapshots` - Data version checkpoints
- `cache_metrics` - Aggregated performance metrics

## Testing

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test --coverage

# Watch mode
pnpm test:watch
```

### Test Scenarios

The test suite covers:

✅ **Cache Hit/Miss**: Basic caching functionality
✅ **Proof Generation**: Cryptographic proof creation and verification
✅ **Invalidation**: Policy, data, and manual invalidation
✅ **Key Consistency**: Deterministic key generation
✅ **Edge Cases**: Special characters, large payloads, concurrent operations
✅ **One-Byte Changes**: Verification that single-byte input changes propagate

## Integration Examples

### With GraphQL Resolver

```typescript
import { hashQuery } from './utils';
import { getCurrentPolicyVersion, getCurrentDataSnapshot } from './policy';

const resolvers = {
  Query: {
    entitySearch: async (_, { query }, context) => {
      const components = {
        queryHash: hashQuery(query),
        paramsHash: hashQuery({ query }),
        policyVersion: await getCurrentPolicyVersion(),
        userAttributes: context.user.abacAttributes,
        dataSnapshot: await getCurrentDataSnapshot('neo4j'),
      };

      // Try cache
      let result = await cache.get(components);

      if (!result) {
        // Execute query
        const data = await neo4jService.search(query);

        // Cache with proof
        result = await cache.set(components, data, {
          computedBy: 'graphql-resolver',
          inputSources: ['neo4j://entities'],
          metadata: { queryType: 'entity-search' },
        });
      }

      // Return data with proof for audit
      return {
        ...result.data,
        _proof: result.proof, // Include proof in response
      };
    },
  },
};
```

### With Policy Change Listener

```typescript
import { EventEmitter } from 'events';

const policyEvents = new EventEmitter();

policyEvents.on('policy:updated', async (event) => {
  const count = await cache.invalidateByPolicy(
    event.oldVersion,
    event.newVersion,
    event.updatedBy
  );

  console.log(`Invalidated ${count} cache entries due to policy update`);
});
```

### With Data Change Detection

```typescript
import { Neo4jWatcher } from './watchers';

const neo4jWatcher = new Neo4jWatcher();

neo4jWatcher.on('snapshot:created', async (snapshot) => {
  const count = await cache.invalidateByDataSnapshot(
    snapshot.previous,
    snapshot.current,
    'system'
  );

  console.log(`Invalidated ${count} cache entries due to data update`);
});
```

## Monitoring & Observability

### Metrics Endpoints

The service exposes metrics for:

- Cache hit rate by policy version
- Cache hit rate by user
- Invalidation frequency
- Proof verification success rate
- Average TTL

### Query Performance Views

```sql
-- Cache hit rate by policy version (last 24h)
SELECT * FROM cache_hit_rate_by_policy;

-- Most invalidated patterns (last 7 days)
SELECT * FROM top_invalidated_patterns;

-- Audit trail for specific user
SELECT * FROM cache_audit_log
WHERE user_id = 'user-123'
ORDER BY timestamp DESC
LIMIT 100;
```

## Security Considerations

### Proof Signatures

- HMAC-SHA256 signatures ensure cache integrity
- Secret key must be rotated periodically
- Tampered cache entries are automatically rejected

### Production Guardrails

```typescript
// In production, use strong secret key
if (process.env.NODE_ENV === 'production') {
  if (!process.env.CACHE_SECRET_KEY ||
      process.env.CACHE_SECRET_KEY === 'dev-secret-key') {
    throw new Error('CACHE_SECRET_KEY must be set in production');
  }
}
```

### Audit Logging

All cache operations are logged with:
- Action (hit, set, invalidate)
- User ID
- Policy version
- Timestamp
- Cache key

## Performance Tuning

### Redis Configuration

```bash
# Recommended Redis settings
redis-cli CONFIG SET maxmemory 2gb
redis-cli CONFIG SET maxmemory-policy allkeys-lru
redis-cli CONFIG SET save ""  # Disable RDB for cache-only use
```

### Connection Pooling

```typescript
const cache = new PolicyAwareCacheService({
  redisUrl: 'redis://localhost:6379',
  databaseUrl: 'postgres://localhost:5432/intelgraph',
  // PostgreSQL pool settings
  poolConfig: {
    max: 20,
    idleTimeoutMillis: 30000,
  },
});
```

### TTL Strategy

```typescript
// Short TTL for frequently changing data
await cache.set(components, data, { ttl: 300 }); // 5 minutes

// Long TTL for stable reference data
await cache.set(components, data, { ttl: 86400 }); // 24 hours
```

## Troubleshooting

### Cache Not Working

1. Check Redis connection:
   ```bash
   redis-cli ping
   ```

2. Verify environment variables:
   ```bash
   echo $REDIS_URL
   echo $CACHE_SECRET_KEY
   ```

3. Check logs:
   ```bash
   docker logs <service-container> | grep POLICY-CACHE
   ```

### High Miss Rate

- Check policy change frequency (view `cache_invalidation_log`)
- Verify data snapshot stability
- Review TTL settings
- Check for overly specific cache keys

### Proof Verification Failures

- Secret key mismatch (check `CACHE_SECRET_KEY`)
- Clock skew between services
- Cache corruption (clear and rebuild)

## Roadmap

- [ ] Support for Redis Cluster
- [ ] Distributed cache coordination (multi-region)
- [ ] Compression for large payloads
- [ ] Tiered caching (memory → Redis → S3)
- [ ] ML-based TTL optimization
- [ ] Real-time invalidation via WebSockets

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

## License

MIT License - see [LICENSE](../../LICENSE)

---

**Built with ❤️ for the IntelGraph platform**
