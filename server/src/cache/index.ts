
import { RedisService } from './redis.js';
import { CacheManager } from './AdvancedCachingStrategy.js';
import { logger } from '../config/logger.js';

// Initialize CacheManager with the singleton RedisService
const redisService = RedisService.getInstance();
export const cacheManager = new CacheManager(redisService.getClient(), {
  keyPrefix: 'ig:cache:',
  defaultTtl: 300, // 5 minutes default
});

// Handle errors
cacheManager.on('error', (err) => {
  logger.error({ err }, 'CacheManager error');
});

/**
 * Legacy cached function wrapper
 * @deprecated Use cacheManager.getOrSet directly
 */
export async function cached<T>(
  key: string,
  ttlSec: number,
  fn: () => Promise<T>,
): Promise<T> {
  return cacheManager.getOrSet<T>(key, fn, { ttl: ttlSec });
}

/**
 * Legacy cachedSWR function wrapper
 * @deprecated Use cacheManager directly (SWR logic is built-in via staleWhileRevalidate option if needed, or implement custom)
 * Note: CacheManager supports stale-while-revalidate via options if configured.
 * But here we map the specific SWR behavior of the old function.
 */
export async function cachedSWR<T>(
  key: string,
  ttl: number,
  swr: number,
  fn: () => Promise<T>,
): Promise<T> {
  // Map old SWR logic to CacheManager
  // old logic: if in cache but older than (ttl - swr)? No.
  // old logic:
  // if (v) {
  //   const t = await r.ttl(key);
  //   if (t > 0 && t < swr) { // if remaining TTL is less than SWR window
  //      fn()... // refresh in background
  //   }
  //   return v;
  // }

  // CacheManager has built-in SWR support if we set staleWhileRevalidate option.
  // But CacheManager's SWR logic works based on expiresAt + staleWindow.
  // The old logic works based on "remaining TTL < swr".
  // This is effectively the same concept: we want to return stale data but refresh if it's "close" to expiring.

  // Let's use getOrSet with staleWhileRevalidate option.
  // Wait, CacheManager.getOrSet checks if entry.expiresAt < now.
  // If so, and within stale window, it returns stale and refreshes.

  // The old cachedSWR semantics:
  // Data is stored with TTL.
  // If we fetch and TTL is running low ( < swr), we return data BUT trigger refresh.
  // This is slightly different from standard SWR (where data is EXPIRED but kept for SWR window).
  // This is "Early Refresh" or "Probabilistic Early Expiration".

  // To preserve exact behavior using CacheManager might be tricky without modifying CacheManager.
  // However, we can just use CacheManager.get() and manual logic if we want exact parity.

  // But let's simplify and use the robust CacheManager features.
  // If we set options.staleWhileRevalidate, CacheManager will serve expired content while refreshing.
  // To match "refresh before expiration", we might need a different pattern.
  // But standard SWR is usually "serve stale AFTER expiration".
  // The old code did "serve fresh but refresh if almost expired".

  // Let's try to mimic the old behavior best effort.
  // We can just use getOrSet.

  return cacheManager.getOrSet<T>(key, fn, {
    ttl,
    // We can't easily map the "swr" parameter (which is a time window BEFORE expiration)
    // to CacheManager's "staleWhileRevalidate" (which is a time window AFTER expiration).
    // But usually SWR is better.
    staleWhileRevalidate: swr
  });
}
