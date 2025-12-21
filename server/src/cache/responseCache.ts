import { getRedisClient } from '../config/database.js';
import {
  cacheLatencySeconds,
  cacheLocalSize,
  recHit,
  recMiss,
  recSet,
} from '../metrics/cacheMetrics.js';
import { buildDeterministicCacheKey } from './cacheKeyBuilder.js';

export type CacheEntry = {
  value: string;
  storedAt: number;
  ttlSeconds: number;
  swrSeconds?: number;
};

export interface CacheTier {
  get(key: string): Promise<CacheEntry | null>;
  set(key: string, entry: CacheEntry): Promise<void>;
  del(key: string): Promise<void>;
  name: string;
}

function serializeEntry(entry: CacheEntry): string {
  return JSON.stringify(entry);
}

function nowEntry(value: string, ttlSeconds: number, swrSeconds?: number): CacheEntry {
  return { value, storedAt: Date.now(), ttlSeconds, swrSeconds };
}

function evaluateEntry(entry: CacheEntry, ttlSeconds: number, swrSeconds: number) {
  const ageSec = (Date.now() - entry.storedAt) / 1000;
  if (ageSec <= ttlSeconds) return 'fresh' as const;
  if (ageSec <= ttlSeconds + swrSeconds) return 'stale' as const;
  return 'expired' as const;
}

class MemoryTier implements CacheTier {
  private cache = new Map<string, CacheEntry>();
  public name = 'memory';

  async get(key: string): Promise<CacheEntry | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const maxAgeMs = (entry.ttlSeconds + (entry.swrSeconds ?? 0)) * 1000;
    if (Date.now() - entry.storedAt > maxAgeMs) {
      this.cache.delete(key);
      return null;
    }

    return entry;
  }

  async set(key: string, entry: CacheEntry): Promise<void> {
    this.cache.set(key, entry);

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

class RedisTier implements CacheTier {
  public name = 'redis';

  async get(key: string): Promise<CacheEntry | null> {
    const redis = getRedisClient();
    if (!redis) return null;
    const raw = await redis.get(key);
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw) as CacheEntry | { value: string; storedAt?: number; ttlSeconds?: number };
      if (parsed && typeof parsed === 'object' && 'value' in parsed && 'storedAt' in parsed) {
        return parsed as CacheEntry;
      }
      const ttlLookup = typeof parsed.ttlSeconds === 'number' ? parsed.ttlSeconds : await redis.ttl(key);
      const ttlSeconds = Number.isFinite(ttlLookup) && ttlLookup > 0 ? ttlLookup : 0;
      return { value: (parsed as any).value ?? raw, storedAt: Date.now(), ttlSeconds };
    } catch {
      const ttlLookup = await getRedisClient()?.ttl(key);
      const ttlSeconds = Number.isFinite(ttlLookup as number) && (ttlLookup as number) > 0 ? (ttlLookup as number) : 0;
      return { value: raw, storedAt: Date.now(), ttlSeconds };
    }
  }

  async set(key: string, entry: CacheEntry): Promise<void> {
    const redis = getRedisClient();
    if (!redis) return;
    const ttl = Math.max(1, entry.ttlSeconds + (entry.swrSeconds ?? 0));
    await redis.set(key, serializeEntry(entry), 'EX', ttl);
  }

  async del(key: string): Promise<void> {
    const redis = getRedisClient();
    if (!redis) return;
    await redis.del(key);
  }

  async addTag(tag: string, key: string): Promise<void> {
    const redis = getRedisClient();
    if (!redis) return;
    await redis.sAdd(`idx:${tag}`, key);
    await redis.sAdd(`idx:tag:${tag}`, key);
    await redis.expire(`idx:${tag}`, 86400);
    await redis.expire(`idx:tag:${tag}`, 86400);
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

const l1 = new MemoryTier();
const l2 = new RedisTier();
const inflight = new Map<string, Promise<any>>();
const refreshInflight = new Map<string, Promise<void>>();

export function getLocalCacheStats() {
  return { size: (l1 as any).cache?.size ?? 0 };
}

export const buildCacheKey = (namespace: string, ...parts: any[]) =>
  buildDeterministicCacheKey(namespace, ...parts);

export async function getCachedJson<T>(
  key: string,
  options: { ttlSeconds?: number; swrSeconds?: number; op?: string; tenant?: string } = {},
): Promise<T | null> {
  const ttl = options.ttlSeconds ?? 60;
  const swr = options.swrSeconds ?? 0;
  const op = options.op ?? 'json';
  const tenant = options.tenant ?? 'unknown';

  const timer = cacheLatencySeconds.startTimer({ op, result: 'lookup', tenant });
  try {
    const entry = await l1.get(key);
    if (entry) {
      const status = evaluateEntry(entry, ttl, swr);
      if (status !== 'expired') {
        recHit('memory', status === 'fresh' ? op : `${op}:stale`, tenant);
        return JSON.parse(entry.value) as T;
      } else {
        await l1.del(key);
      }
    }

    const l2Entry = await l2.get(key);
    if (l2Entry) {
      const status = evaluateEntry(l2Entry, ttl, swr);
      await l1.set(key, { ...l2Entry, swrSeconds: swr || l2Entry.swrSeconds });
      recHit('redis', status === 'fresh' ? op : `${op}:stale`, tenant);
      return JSON.parse(l2Entry.value) as T;
    }
  } finally {
    timer();
  }

  return null;
}

export async function setCachedJson(
  key: string,
  payload: any,
  options: { ttlSeconds?: number; indexPrefixes?: string[]; swrSeconds?: number; tenant?: string } = {},
): Promise<void> {
  const ttl = options.ttlSeconds ?? 60;
  const swrSeconds = options.swrSeconds ?? 0;
  const entry = nowEntry(JSON.stringify(payload), ttl, swrSeconds);

  await l1.set(key, entry);
  try {
    await l2.set(key, entry);
    if (options.indexPrefixes) {
      for (const prefix of options.indexPrefixes) {
        await l2.addTag(prefix, key);
        if (options.tenant) {
          await l2.addTag(`${prefix}:${options.tenant}`, key);
        }
      }
    }
  } catch {
    /* ignore */
  }
}

export async function cacheQueryResult<T>(
  query: string,
  params: any,
  fetcher: () => Promise<T>,
  options: { ttlSec?: number; tenant?: string } = {},
): Promise<T> {
  const keyParts = ['query', options.tenant || 'global', query, params];
  return cached(keyParts, { ttlSec: options.ttlSec || 300, op: 'query' }, fetcher);
}

export function flushLocalCache() {
  l1.clear();
}

export async function invalidateCache(tag: string, tenantId?: string) {
  await l2.invalidateByTag(tag);
  if (tenantId) {
    await l2.invalidateByTag(`${tag}:${tenantId}`);
  }
}

function chooseKey(keyParts: any[]): string {
  return 'gql:' + buildDeterministicCacheKey('gql', keyParts);
}

function scheduleRefresh<T>(
  key: string,
  ttlSec: number,
  swrSec: number,
  fetcher: () => Promise<T>,
  op: string,
  tags: string[],
  tenant: string,
) {
  if (refreshInflight.has(key)) return;
  const task = (async () => {
    try {
      const val = await fetcher();
      const valStr = JSON.stringify(val);
      const entry = nowEntry(valStr, ttlSec, swrSec);
      await l1.set(key, entry);
      recSet('memory', `${op}:refresh`, tenant);
      try {
        if (process.env.REDIS_DISABLE !== '1') {
          await l2.set(key, entry);
          recSet('redis', `${op}:refresh`, tenant);
          const prefix = tags[0] ?? 'generic';
          const allTags = new Set([...tags, prefix]);
          if (tenant) allTags.add(`${prefix}:${tenant}`);
          for (const tag of allTags) {
            await l2.addTag(tag, key);
          }
        }
      } catch {
        /* ignore redis failures */
      }
    } catch {
      /* swallow refresh errors */
    }
  })().finally(() => refreshInflight.delete(key));
  refreshInflight.set(key, task);
}

export async function cached<T>(
  keyParts: any[],
  ttlOrOptions: number | { ttlSec?: number; tags?: string[]; op?: string; swrSec?: number },
  fetcher: () => Promise<T>,
  opOverride?: string,
  tagsOverride?: string[],
): Promise<T> {
  const ttlSec = typeof ttlOrOptions === 'number' ? ttlOrOptions : ttlOrOptions.ttlSec ?? 300;
  const op = opOverride || (typeof ttlOrOptions === 'object' ? ttlOrOptions.op : 'generic') || 'generic';
  const tags = tagsOverride || (typeof ttlOrOptions === 'object' ? ttlOrOptions.tags : []) || [];
  const swrSec = typeof ttlOrOptions === 'object' ? ttlOrOptions.swrSec ?? 0 : 0;

  const redisDisabled = process.env.REDIS_DISABLE === '1';
  const key = chooseKey(keyParts);
  const tenant = typeof keyParts?.[1] === 'string' ? keyParts[1] : 'unknown';

  const l1Entry = await l1.get(key);
  if (l1Entry) {
    const status = evaluateEntry(l1Entry, ttlSec, swrSec);
    if (status === 'fresh') {
      recHit('memory', op, tenant);
      cacheLatencySeconds.observe({ op, result: 'hit', tenant }, 0);
      return JSON.parse(l1Entry.value) as T;
    }
    if (status === 'stale') {
      recHit('memory', `${op}:stale`, tenant);
      cacheLatencySeconds.observe({ op, result: 'stale', tenant }, 0);
      scheduleRefresh(key, ttlSec, swrSec, fetcher, op, tags, tenant);
      return JSON.parse(l1Entry.value) as T;
    }
  }

  if (!redisDisabled) {
    const redisTimer = cacheLatencySeconds.startTimer({ op, result: 'redis_lookup', tenant });
    try {
      const l2Entry = await l2.get(key);
      if (l2Entry) {
        const status = evaluateEntry(l2Entry, ttlSec, swrSec);
        await l1.set(key, { ...l2Entry, swrSeconds: swrSec || l2Entry.swrSeconds });
        if (status === 'fresh') {
          recHit('redis', op, tenant);
          redisTimer();
          return JSON.parse(l2Entry.value) as T;
        }
        if (status === 'stale') {
          recHit('redis', `${op}:stale`, tenant);
          redisTimer();
          scheduleRefresh(key, ttlSec, swrSec, fetcher, op, tags, tenant);
          return JSON.parse(l2Entry.value) as T;
        }
      }
    } finally {
      redisTimer();
    }
  }

  if (inflight.has(key)) {
    return inflight.get(key)! as Promise<T>;
  }

  recMiss(redisDisabled ? 'memory' : 'redis', op, tenant);
  const fetchTimer = cacheLatencySeconds.startTimer({ op, result: 'fetch', tenant });
  const promise = (async () => {
    try {
      const val = await fetcher();
      const valStr = JSON.stringify(val);
      const entry = nowEntry(valStr, ttlSec, swrSec);

      await l1.set(key, entry);
      recSet('memory', op, tenant);

      if (!redisDisabled) {
        try {
          await l2.set(key, entry);
          recSet('redis', op, tenant);

          const prefix = String(keyParts?.[0] ?? 'misc');
          const allTags = new Set([...tags, prefix]);
          if (keyParts?.[1]) {
            allTags.add(`${prefix}:${keyParts[1]}`);
          }
          for (const tag of allTags) {
            await l2.addTag(tag, key);
          }
        } catch {
          /* ignore */
        }
      }

      return val;
    } finally {
      fetchTimer();
    }
  })();

  inflight.set(key, promise);
  try {
    return await promise;
  } finally {
    inflight.delete(key);
  }
}
