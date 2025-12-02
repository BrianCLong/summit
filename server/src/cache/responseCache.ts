import crypto from 'node:crypto';
import config from '../config/index.js';
import { getRedisClient } from '../config/database.js';
import {
  recHit,
  recMiss,
  recSet,
  cacheLocalSize,
} from '../metrics/cacheMetrics.js';

type CacheEntry<T> = {
  ts: number;
  ttl: number;
  val: T;
  tags: string[];
  op: string;
};

type CacheOptions = {
  ttlSec: number;
  swrSec?: number;
  tags?: string[];
  op?: string;
  cacheName?: string;
};

const memoryCache = new Map<string, CacheEntry<any>>();

function updateLocalGauge(namespace = 'default') {
  cacheLocalSize.labels(namespace).set(memoryCache.size);
}

export function flushLocalCache() {
  memoryCache.clear();
  updateLocalGauge();
}

export function getLocalCacheStats() {
  return {
    size: memoryCache.size,
  };
}

function resolveKey(keyParts: any[]): string {
  return (
    'gql:' + crypto.createHash('sha1').update(JSON.stringify(keyParts)).digest('hex')
  );
}

function resolveOptions(ttlOrOpts: number | CacheOptions, op: string): CacheOptions {
  if (typeof ttlOrOpts === 'number') {
    return { ttlSec: ttlOrOpts, op };
  }
  return { ...ttlOrOpts, op: ttlOrOpts.op || op };
}

async function recordIndexes(
  redis: any,
  key: string,
  keyParts: any[],
  tags: string[],
) {
  const prefix = String(keyParts?.[0] ?? 'misc');
  await redis.sAdd(`idx:${prefix}`, key);
  if (keyParts?.[1]) await redis.sAdd(`idx:${prefix}:${keyParts[1]}`, key);
  for (const tag of tags || []) {
    await redis.sAdd(`idx:tag:${tag}`, key);
  }
}

async function writeMetadata(
  redis: any,
  key: string,
  ttlSec: number,
  op: string,
  tags: string[],
) {
  const meta = {
    op,
    tags,
    ttlSec,
    createdAt: Date.now(),
  };
  await redis.set(`meta:${key}`, JSON.stringify(meta), {
    EX: ttlSec + Math.max(config.cache.staleWhileRevalidateSeconds, 0),
  });
}

export async function cached<T>(
  keyParts: any[],
  ttlOrOpts: number | CacheOptions,
  fetcher: () => Promise<T>,
  op: string = 'generic',
): Promise<T> {
  const opts = resolveOptions(ttlOrOpts, op);
  const ttlSec = opts.ttlSec;
  const tags = opts.tags || [];
  const operation = opts.op || 'generic';
  const swrSec = opts.swrSec;
  const redisDisabled = process.env.REDIS_DISABLE === '1';
  const redis = redisDisabled ? null : getRedisClient();
  const key = resolveKey(keyParts);
  const now = Date.now();
  const tenant = typeof keyParts?.[1] === 'string' ? keyParts[1] : 'unknown';
  const store = redis ? 'redis' : 'memory';

  const local = memoryCache.get(key);
  if (local && now - local.ts < local.ttl * 1000) {
    recHit('memory', operation, tenant);
    return local.val as T;
  }

  if (redis) {
    try {
      const hit = await redis.get(key);
      if (hit) {
        const parsed = JSON.parse(hit) as T;
        recHit('redis', operation, tenant);
        memoryCache.set(key, { ts: now, ttl: ttlSec, val: parsed, tags, op: operation });
        updateLocalGauge();
        if (swrSec) {
          try {
            const ttl = await redis.ttl(key);
            if (ttl > 0 && ttl < swrSec) {
              fetcher()
                .then(async (fresh) => {
                  await redis.set(key, JSON.stringify(fresh), { EX: ttlSec });
                  await Promise.all([
                    recordIndexes(redis, key, keyParts, tags),
                    writeMetadata(redis, key, ttlSec, operation, tags),
                  ]);
                  memoryCache.set(key, {
                    ts: Date.now(),
                    ttl: ttlSec,
                    val: fresh,
                    tags,
                    op: operation,
                  });
                  updateLocalGauge();
                })
                .catch(() => {});
            }
          } catch {}
        }
        return parsed;
      }
      recMiss('redis', operation, tenant);
      const val = await fetcher();
      await redis.set(key, JSON.stringify(val), {
        EX: ttlSec,
        NX: true,
      } as any);
      await Promise.all([
        recordIndexes(redis, key, keyParts, tags),
        writeMetadata(redis, key, ttlSec, operation, tags),
      ]);
      recSet('redis', operation, tenant);
      memoryCache.set(key, { ts: now, ttl: ttlSec, val, tags, op: operation });
      updateLocalGauge();
      return val;
    } catch {
      // ignore and fall back to memory
    }
  }

  const val = await fetcher();
  memoryCache.set(key, { ts: now, ttl: ttlSec, val, tags, op: operation });
  recMiss(store, operation, tenant);
  recSet('memory', operation, tenant);
  updateLocalGauge();
  return val;
}

export async function cacheQueryResult<T>(
  query: string,
  variables: any,
  fetcher: () => Promise<T>,
  options?: Partial<CacheOptions> & { tenant?: string },
): Promise<T> {
  const ttlSec = options?.ttlSec || config.cache.queryTtlSeconds;
  const keyParts = ['query', options?.tenant || 'global', query, variables];
  return cached(keyParts, { ...options, ttlSec, op: options?.op || 'query' }, fetcher);
}
