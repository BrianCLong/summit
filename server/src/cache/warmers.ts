import crypto from 'node:crypto';
import { getPostgresPool, getRedisClient } from '../config/database.js';
import config from '../config/index.js';
import { cached } from './responseCache.js';
import { cacheSets, cacheHits, cacheMisses } from '../metrics/cacheMetrics.js';
import logger from '../utils/logger.js';

export type CacheWarmer = {
  name: string;
  keyParts: any[];
  ttlSec: number;
  tags?: string[];
  patterns?: string[];
  fetcher: () => Promise<any>;
};

export type WarmReason = 'startup' | 'schedule' | 'invalidation' | 'manual';

type WarmResult = {
  name: string;
  ok: boolean;
  reason: WarmReason;
  error?: string;
};

const warmers: CacheWarmer[] = [];
let initialized = false;
let lastRun: number | null = null;
let lastResults: WarmResult[] = [];
let warmInterval: NodeJS.Timeout | null = null;

function shouldRunWarmer(warmer: CacheWarmer, patterns: string[]): boolean {
  if (!patterns.length) return true;
  if (!warmer.patterns || !warmer.patterns.length) return true;
  return warmer.patterns.some((p) => patterns.includes(p) || p === '*');
}

async function acquireLock(redis: any, ttlMs: number, lockKey: string, lockId: string) {
  if (!redis) return true;
  try {
    const res = await redis.set(lockKey, lockId, { PX: ttlMs, NX: true });
    return res === 'OK';
  } catch {
    return true;
  }
}

async function releaseLock(redis: any, lockKey: string, lockId: string) {
  if (!redis) return;
  try {
    const existing = await redis.get(lockKey);
    if (existing === lockId) await redis.del(lockKey);
  } catch {}
}

export function registerCacheWarmer(warmer: CacheWarmer) {
  warmers.push(warmer);
}

export function resetWarmersForTesting() {
  warmers.length = 0;
  lastResults = [];
  lastRun = null;
  if (warmInterval) {
    clearInterval(warmInterval);
    warmInterval = null;
  }
  initialized = false;
}

export function getWarmerStats() {
  return {
    registered: warmers.length,
    lastRun,
    lastResults,
  };
}

export async function runWarmers(
  reason: WarmReason = 'manual',
  patterns: string[] = [],
): Promise<WarmResult[]> {
  const redis = process.env.REDIS_DISABLE === '1' ? null : getRedisClient();
  const lockKey = 'cache:warm:lock';
  const lockId = crypto.randomUUID();
  const lockTtlMs = config.cache.warmerIntervalSeconds * 1000;

  const lockAcquired = await acquireLock(redis, lockTtlMs, lockKey, lockId);
  if (!lockAcquired) return [];

  const results: WarmResult[] = [];
  try {
    for (const warmer of warmers) {
      if (!shouldRunWarmer(warmer, patterns)) continue;
      try {
        await cached(
          warmer.keyParts,
          {
            ttlSec: warmer.ttlSec,
            tags: warmer.tags,
            op: `${reason}:${warmer.name}`,
            swrSec: config.cache.staleWhileRevalidateSeconds,
          },
          warmer.fetcher,
        );
        results.push({ name: warmer.name, ok: true, reason });
        cacheHits.labels('warm', warmer.name, 'system').inc();
        cacheSets.labels('warm', warmer.name, 'system').inc();
      } catch (error) {
        logger.warn(
          { err: error, warmer: warmer.name },
          'Cache warmer failed',
        );
        results.push({
          name: warmer.name,
          ok: false,
          reason,
          error: (error as Error).message,
        });
        cacheMisses.labels('warm', warmer.name, 'system').inc();
      }
    }
  } finally {
    lastRun = Date.now();
    lastResults = results;
    await releaseLock(redis, lockKey, lockId);
  }
  return results;
}

export function scheduleWarmersAfterInvalidation(patterns: string[]) {
  if (!config.cache.warmersEnabled) return;
  setTimeout(() => {
    runWarmers('invalidation', patterns).catch(() => {});
  }, 200);
}

export async function initializeCacheWarmers(): Promise<void> {
  if (initialized || !config.cache.warmersEnabled) return;
  initialized = true;

  registerCacheWarmer({
    name: 'counts-default-tenant',
    keyParts: ['counts', 'anon'],
    ttlSec: config.cache.defaultTtlSeconds,
    tags: ['counts'],
    patterns: ['counts:*'],
    fetcher: async () => {
      const pool = getPostgresPool();
      const sql = `SELECT status, COUNT(*)::int AS c FROM investigations WHERE tenant_id=$1 GROUP BY status`;
      const r = await pool.query(sql, ['anon']);
      const list = Array.isArray(r?.rows) ? r.rows : [];
      const byStatus: Record<string, number> = {};
      let total = 0;
      for (const row of list) {
        const k = String((row as any)?.status ?? 'UNKNOWN');
        const v = Number((row as any)?.c ?? (row as any)?.count ?? 0);
        byStatus[k] = (byStatus[k] || 0) + v;
        total += v;
      }
      return { byStatus, total };
    },
  });

  registerCacheWarmer({
    name: 'summary-default-tenant',
    keyParts: ['summary', 'anon'],
    ttlSec: config.cache.defaultTtlSeconds,
    tags: ['summary'],
    patterns: ['summary:*'],
    fetcher: async () => {
      const pool = getPostgresPool();
      const r1 = await pool.query(
        `SELECT COUNT(*)::int AS entities FROM entities WHERE tenant_id = $1`,
        ['anon'],
      );
      const r2 = await pool.query(
        `SELECT COUNT(*)::int AS relationships FROM relationships WHERE tenant_id = $1`,
        ['anon'],
      );
      const r3 = await pool.query(
        `SELECT COUNT(*)::int AS investigations FROM investigations WHERE tenant_id = $1`,
        ['anon'],
      );
      return {
        entities: r1.rows?.[0]?.entities || 0,
        relationships: r2.rows?.[0]?.relationships || 0,
        investigations: r3.rows?.[0]?.investigations || 0,
      };
    },
  });

  await runWarmers('startup');

  warmInterval = setInterval(() => {
    runWarmers('schedule').catch(() => {});
  }, config.cache.warmerIntervalSeconds * 1000);
}
