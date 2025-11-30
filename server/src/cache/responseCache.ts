import { getRedisClient } from '../config/database.js';
import crypto from 'node:crypto';
import {
  recHit,
  recMiss,
  recSet,
  cacheLocalSize,
} from '../metrics/cacheMetrics.js';

// Cache Tier Interface
export interface CacheTier {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttl: number): Promise<void>;
  del(key: string): Promise<void>;
  name: string;
}

// Memory Tier (L1)
class MemoryTier implements CacheTier {
  private cache = new Map<string, { ts: number; ttl: number; val: string }>();
  public name = 'memory';

  async get(key: string): Promise<string | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.ts > entry.ttl * 1000) {
      this.cache.delete(key);
      return null;
    }
    return entry.val;
  }

  async set(key: string, value: string, ttl: number): Promise<void> {
    this.cache.set(key, { ts: Date.now(), ttl, val: value });

    // Simple eviction policy
    if (this.cache.size > 10000) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    cacheLocalSize.labels('default').set(this.cache.size);
  }

  async del(key: string): Promise<void> {
    this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }
}

// Redis Tier (L2)
class RedisTier implements CacheTier {
  public name = 'redis';

  async get(key: string): Promise<string | null> {
    const redis = getRedisClient();
    if (!redis) return null;
    return redis.get(key);
  }

  async set(key: string, value: string, ttl: number): Promise<void> {
    const redis = getRedisClient();
    if (!redis) return;
    await redis.set(key, value, 'EX', ttl);
  }

  async del(key: string): Promise<void> {
    const redis = getRedisClient();
    if (!redis) return;
    await redis.del(key);
  }

  // Redis specific methods for tagging
  async addTag(tag: string, key: string): Promise<void> {
    const redis = getRedisClient();
    if (!redis) return;
    await redis.sAdd(`idx:${tag}`, key);
    await redis.expire(`idx:${tag}`, 86400); // Index expires in 24h
  }

  async invalidateByTag(tag: string): Promise<void> {
    const redis = getRedisClient();
    if (!redis) return;

    const keys = await redis.sMembers(`idx:${tag}`);
    if (keys.length > 0) {
      await redis.del(...keys);
      await redis.del(`idx:${tag}`);
    }
  }
}

// Singleton instances
const l1 = new MemoryTier();
const l2 = new RedisTier();

export function flushLocalCache() {
  l1.clear();
}

/**
 * Invalidate cache by tag (Smart Invalidation)
 */
export async function invalidateCache(tag: string, tenantId?: string) {
  // Invalidate in Redis
  await l2.invalidateByTag(tag);
  if (tenantId) {
    await l2.invalidateByTag(`${tag}:${tenantId}`);
  }

  // Note: We can't easily invalidate specific keys in L1 across all instances
  // without a pub/sub mechanism. For now, L1 relies on short TTLs.
  // Ideally, subscribe to an invalidation channel here.
}

export async function cached<T>(
  keyParts: any[],
  ttlSec: number,
  fetcher: () => Promise<T>,
  op: string = 'generic',
  tags: string[] = [] // New: Smart invalidation tags
): Promise<T> {
  const redisDisabled = process.env.REDIS_DISABLE === '1';
  const key = 'gql:' + crypto.createHash('sha1').update(JSON.stringify(keyParts)).digest('hex');
  const tenant = typeof keyParts?.[1] === 'string' ? keyParts[1] : 'unknown';

  // L1 Check
  const l1Hit = await l1.get(key);
  if (l1Hit) {
    recHit('memory', op, tenant);
    return JSON.parse(l1Hit) as T;
  }

  // L2 Check
  if (!redisDisabled) {
    try {
      const l2Hit = await l2.get(key);
      if (l2Hit) {
        recHit('redis', op, tenant);
        // Populate L1
        await l1.set(key, l2Hit, ttlSec);
        return JSON.parse(l2Hit) as T;
      }
    } catch (e) {
      // Ignore redis errors
    }
  }

  // Fetch
  recMiss(redisDisabled ? 'memory' : 'redis', op, tenant);
  const val = await fetcher();
  const valStr = JSON.stringify(val);

  // Populate L1
  await l1.set(key, valStr, ttlSec);
  recSet('memory', op, tenant);

  // Populate L2
  if (!redisDisabled) {
    try {
      await l2.set(key, valStr, ttlSec);
      recSet('redis', op, tenant);

      // Auto-tagging based on key parts prefix
      const prefix = String(keyParts?.[0] ?? 'misc');
      const allTags = new Set([...tags, prefix]);

      if (keyParts?.[1]) {
        allTags.add(`${prefix}:${keyParts[1]}`);
      }

      for (const tag of allTags) {
        await l2.addTag(tag, key);
      }
    } catch (e) {
      // Ignore
    }
  }

  return val;
}
