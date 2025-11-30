import crypto from 'node:crypto';
import pino from 'pino';
import { getRedisClient, isRedisMock } from '../db/redis.js';
import { cfg } from '../config.js';
import {
  recHit,
  recMiss,
  recSet,
  cacheLocalSize,
} from '../metrics/cacheMetrics.js';

const memoryCache = new Map<string, { ts: number; ttl: number; val: any }>();
const logger = pino({ name: 'response-cache' });

interface CacheOptions {
  ttlSeconds?: number;
  op?: string;
  tenantId?: string;
  indexPrefixes?: (string | undefined)[];
  recordMiss?: boolean;
}

function nowMs(): number {
  return Date.now();
}

export function flushLocalCache() {
  memoryCache.clear();
  cacheLocalSize.labels('default').set(memoryCache.size);
}

export function buildCacheKey(namespace: string, identifier: string): string {
  return `${namespace}:${identifier}`;
}

export async function getCachedJson<T>(
  key: string,
  options: CacheOptions = {},
): Promise<T | null> {
  if (!cfg.CACHE_ENABLED) {
    return null;
  }

  const ttl = options.ttlSeconds ?? cfg.CACHE_TTL_DEFAULT;
  const op = options.op ?? 'response-cache';
  const tenantId = options.tenantId ?? 'unknown';
  const recordMiss = options.recordMiss ?? true;
  const redis = getRedisClient();
  const useRedis = redis && !isRedisMock(redis);
  const current = nowMs();

  const local = memoryCache.get(key);
  if (local && current - local.ts < ttl * 1000) {
    recHit('memory', op, tenantId);
    return local.val as T;
  }

  if (useRedis) {
    try {
      const hit = await redis.get(key);
      if (hit) {
        const parsed = JSON.parse(hit) as T;
        recHit('redis', op, tenantId);
        memoryCache.set(key, { ts: current, ttl, val: parsed });
        cacheLocalSize.labels('default').set(memoryCache.size);
        return parsed;
      }
    } catch (error) {
      logger.warn({ err: error }, 'Redis cache lookup failed');
    }
  }

  if (recordMiss) {
    recMiss(useRedis ? 'redis' : 'memory', op, tenantId);
  }
  return null;
}

export async function setCachedJson<T>(
  key: string,
  value: T,
  options: CacheOptions = {},
): Promise<void> {
  if (!cfg.CACHE_ENABLED) {
    return;
  }

  const ttl = options.ttlSeconds ?? cfg.CACHE_TTL_DEFAULT;
  const op = options.op ?? 'response-cache';
  const tenantId = options.tenantId ?? 'unknown';
  const redis = getRedisClient();
  const useRedis = redis && !isRedisMock(redis);

  memoryCache.set(key, { ts: nowMs(), ttl, val: value });
  cacheLocalSize.labels('default').set(memoryCache.size);
  recSet('memory', op, tenantId);

  if (useRedis) {
    try {
      await redis.set(key, JSON.stringify(value), 'EX', ttl);
      recSet('redis', op, tenantId);
      if (options.indexPrefixes?.length) {
        for (const prefix of options.indexPrefixes.filter(Boolean)) {
          await redis.sAdd(`idx:${prefix}`, key);
          await redis.sAdd(`idx:${prefix}:${tenantId}`, key);
        }
      }
    } catch (error) {
      logger.warn({ err: error }, 'Redis cache write failed');
    }
  }
}

export async function deleteCachedEntry(
  key: string,
  op = 'response-cache',
  tenantId = 'unknown',
): Promise<void> {
  memoryCache.delete(key);
  cacheLocalSize.labels('default').set(memoryCache.size);
  const redis = getRedisClient();
  const useRedis = redis && !isRedisMock(redis);
  if (useRedis) {
    try {
      await redis.del(key);
      recSet('redis', op, tenantId);
    } catch (error) {
      logger.warn({ err: error }, 'Redis cache delete failed');
    }
  }
}

export async function cached<T>(
  keyParts: any[],
  ttlSec: number,
  fetcher: () => Promise<T>,
  op: string = 'generic',
): Promise<T> {
  const tenant = typeof keyParts?.[1] === 'string' ? keyParts[1] : 'unknown';
  const key =
    'gql:' +
    crypto.createHash('sha1').update(JSON.stringify(keyParts)).digest('hex');
  const redis = getRedisClient();
  const useRedis = redis && !isRedisMock(redis);

  const cachedVal = await getCachedJson<T>(key, {
    ttlSeconds: ttlSec,
    op,
    tenantId: tenant,
    recordMiss: false,
  });

  if (cachedVal !== null) {
    return cachedVal;
  }

  const val = await fetcher();
  await setCachedJson(key, val, {
    ttlSeconds: ttlSec,
    op,
    tenantId: tenant,
    indexPrefixes: [String(keyParts?.[0] ?? 'misc')],
  });
  recMiss(useRedis ? 'redis' : 'memory', op, tenant);
  return val;
}
