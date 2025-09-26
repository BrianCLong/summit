import { getRedisClient } from '../config/database.js';
import { flushLocalCache } from './responseCache.js';
import { recInvalidation } from '../metrics/cacheMetrics.js';
import { publishInvalidation } from './redis.js';

export interface InvalidationMeta {
  tenant?: string;
  reason?: string;
}

/**
 * Invalidate cached keys by index patterns like 'counts:*' or 'investigations:*' or 'investigations:tenant1'
 * Requires responseCache to have written index sets: idx:<prefix> and idx:<prefix>:<tenant>
 */
export async function emitInvalidation(patterns: string[], meta: InvalidationMeta = {}): Promise<void> {
  const redis = getRedisClient();
  const toDelete = new Set<string>();

  try {
    if (!redis) {
      flushLocalCache();
      return;
    }

    for (const pat of patterns || []) {
      const [prefix, rest] = String(pat).split(':');
      const idxKey = rest && rest !== '*' ? `idx:${prefix}:${rest}` : `idx:${prefix}`;
      try {
        const members = await redis.sMembers(idxKey);
        for (const k of members || []) toDelete.add(k);
        if (members?.length) await redis.sRem(idxKey, members);
      } catch (err) {
        console.warn('Failed to gather invalidation members for', idxKey, err);
      }
      recInvalidation(pat, meta.tenant);
    }

    if (toDelete.size) {
      await redis.del([...toDelete]);
    }
  } finally {
    flushLocalCache(); // ensure local fallback cache is cleared as well
  }

  await publishInvalidation({
    patterns,
    keys: [...toDelete],
    tenant: meta.tenant,
    reason: meta.reason,
  });
}
