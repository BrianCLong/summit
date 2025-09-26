import { getRedisClient } from '../config/database.js';
import crypto from 'node:crypto';
import { recHit, recMiss, recSet, cacheLocalSize } from '../metrics/cacheMetrics.js';
import { onGraphCacheInvalidation } from './redis.js';

type CacheStore = 'redis' | 'memory';

type CacheEvent = {
  store: CacheStore;
  status: 'hit' | 'miss';
  op: string;
  tenant: string;
};

type CacheOptions = {
  op?: string;
  ctx?: any;
  tags?: string[];
};

const memoryCache = new Map<string, { ts: number; ttl: number; val: any }>();

function recordEvent(ctx: any | undefined, event: CacheEvent) {
  if (!ctx) return;
  const bucket = (ctx.__cacheMetrics ??= { events: [] as CacheEvent[] });
  bucket.events.push(event);
}

export function flushLocalCache() {
  memoryCache.clear();
  cacheLocalSize.labels('default').set(0);
}

onGraphCacheInvalidation(() => {
  flushLocalCache();
});

export async function cached<T>(
  keyParts: any[],
  ttlSec: number,
  fetcher: () => Promise<T>,
  options: string | CacheOptions = 'generic',
): Promise<T> {
  const opts: CacheOptions = typeof options === 'string' ? { op: options } : options ?? {};
  const opName = opts.op ?? 'generic';
  const ctx = opts.ctx;
  const tags = Array.isArray(opts.tags) ? opts.tags : [];

  const redisDisabled = process.env.REDIS_DISABLE === '1';
  const redis = redisDisabled ? null : getRedisClient();
  const key = 'gql:' + crypto.createHash('sha1').update(JSON.stringify(keyParts)).digest('hex');
  const now = Date.now();
  const tenant = typeof keyParts?.[1] === 'string' ? keyParts[1] : 'unknown';
  const ttl = Math.max(1, Number.isFinite(ttlSec) ? ttlSec : 1);

  const local = memoryCache.get(key);
  if (local && now - local.ts < local.ttl * 1000) {
    recHit('memory', opName, tenant);
    recordEvent(ctx, { store: 'memory', status: 'hit', op: opName, tenant });
    return local.val as T;
  }

  if (redis) {
    try {
      const hit = await redis.get(key);
      if (hit) {
        const parsed = JSON.parse(hit) as T;
        recHit('redis', opName, tenant);
        recordEvent(ctx, { store: 'redis', status: 'hit', op: opName, tenant });
        memoryCache.set(key, { ts: now, ttl, val: parsed });
        cacheLocalSize.labels('default').set(memoryCache.size);
        return parsed;
      }
      recMiss('redis', opName, tenant);
      recordEvent(ctx, { store: 'redis', status: 'miss', op: opName, tenant });
      const val = await fetcher();
      await redis.set(key, JSON.stringify(val), 'EX', ttl);
      recSet('redis', opName, tenant);
      try {
        const prefix = String(keyParts?.[0] ?? 'misc');
        await redis.sAdd(`idx:${prefix}`, key);
        if (keyParts?.[1]) await redis.sAdd(`idx:${prefix}:${keyParts[1]}`, key);
        for (const tag of tags) {
          await redis.sAdd(`idx:tag:${tag}`, key);
        }
      } catch {}
      memoryCache.set(key, { ts: now, ttl, val });
      cacheLocalSize.labels('default').set(memoryCache.size);
      return val;
    } catch {
      // ignore redis failures and fall back to local cache only
    }
  }

  const val = await fetcher();
  memoryCache.set(key, { ts: now, ttl, val });
  cacheLocalSize.labels('default').set(memoryCache.size);
  recMiss(redis ? 'redis' : 'memory', opName, tenant);
  recordEvent(ctx, {
    store: redis ? 'redis' : 'memory',
    status: 'miss',
    op: opName,
    tenant,
  });
  recSet('memory', opName, tenant);
  return val;
}
