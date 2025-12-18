import { getRedisClient } from '../config/database.js';
import { flushLocalCache } from './responseCache.js';
import { scheduleWarmersAfterInvalidation } from './warmers.js';
import { recInvalidation } from '../metrics/cacheMetrics.js';

const INVALIDATION_CHANNEL = 'cache:invalidation';
let subscriberStarted = false;

async function broadcastInvalidation(patterns: string[]) {
  const redis = getRedisClient();
  if (!redis) return;
  try {
    await redis.publish(INVALIDATION_CHANNEL, JSON.stringify({ patterns }));
  } catch {}
}

async function performInvalidation(redis: any, patterns: string[]): Promise<void> {
  if (!redis) {
    flushLocalCache();
    return;
  }

  const toDelete = new Set<string>();
  for (const pat of patterns || []) {
    const [prefix, rest] = String(pat).split(':');
    const idxKey =
      prefix === 'tag'
        ? `idx:tag:${rest}`
        : rest && rest !== '*' ? `idx:${prefix}:${rest}` : `idx:${prefix}`;
    try {
      const members = await redis.sMembers(idxKey);
      for (const k of members || []) toDelete.add(k);
      if (members?.length) await redis.sRem(idxKey, members);
    } catch {}
  }
  if (toDelete.size) await redis.del([...toDelete]);
}

export async function startCacheInvalidationListener(): Promise<void> {
  if (subscriberStarted) return;
  const base = getRedisClient() as any;
  if (!base || typeof base.duplicate !== 'function') return;
  try {
    const sub = base.duplicate();
    if (!sub) return;
    subscriberStarted = true;
    if (typeof sub.connect === 'function') await sub.connect();
    sub.on('message', async (_channel: string, payload: string) => {
      try {
        const parsed = JSON.parse(payload || '{}');
        if (Array.isArray(parsed?.patterns)) {
          await performInvalidation(getRedisClient(), parsed.patterns);
          parsed.patterns.forEach((p: string) => recInvalidation(p));
        }
      } catch {}
      flushLocalCache();
    });
    await sub.subscribe(INVALIDATION_CHANNEL);
  } catch {
    subscriberStarted = false;
  }
}

/**
 * Invalidate cached keys by index patterns like 'counts:*' or 'investigations:*' or 'investigations:tenant1'
 * Requires responseCache to have written index sets: idx:<prefix> and idx:<prefix>:<tenant>
 */
export async function emitInvalidation(
  patterns: string[],
  tenant?: string,
): Promise<void> {
  const redis = getRedisClient();
  try {
    await performInvalidation(redis, patterns);
    patterns.forEach((p) => recInvalidation(p, tenant));
    await broadcastInvalidation(patterns);
    scheduleWarmersAfterInvalidation(patterns);
  } finally {
    flushLocalCache(); // ensure local fallback cache is cleared as well
  }
}
