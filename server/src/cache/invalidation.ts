import { getRedisClient } from '../config/database.js';
import { flushLocalCache } from './responseCache.js';
import { recInvalidation } from '../metrics/cacheMetrics.js';

/**
 * Invalidate cached keys by index patterns like 'counts:*' or 'investigations:*' or 'investigations:tenant1'
 * Requires responseCache to have written index sets: idx:<prefix> and idx:<prefix>:<tenant>
 */
export async function emitInvalidation(patterns: string[]): Promise<void> {
  const redis = getRedisClient();
  try {
    if (!redis) {
      flushLocalCache();
      return;
    }
    const toDelete = new Set<string>();
    for (const pat of patterns || []) {
      const [prefix, rest] = String(pat).split(':');
      const idxKey =
        rest && rest !== '*' ? `idx:${prefix}:${rest}` : `idx:${prefix}`;
      try {
        const members = await redis.sMembers(idxKey);
        for (const k of members || []) toDelete.add(k);
        if (members?.length) await redis.sRem(idxKey, members);
      } catch {}
    }
    if (toDelete.size) await redis.del([...toDelete]);
  } finally {
    flushLocalCache(); // ensure local fallback cache is cleared as well
  }
}
