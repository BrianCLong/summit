import { getRedisClient } from '../config/database.js';
import crypto from 'node:crypto';
import { recHit, recMiss, recSet, cacheLocalSize } from '../metrics/cacheMetrics.js';
const memoryCache = new Map();
export function flushLocalCache() {
    memoryCache.clear();
}
export async function cached(keyParts, ttlSec, fetcher, op = 'generic') {
    const redisDisabled = process.env.REDIS_DISABLE === '1';
    const redis = redisDisabled ? null : getRedisClient();
    const key = 'gql:' + crypto.createHash('sha1').update(JSON.stringify(keyParts)).digest('hex');
    const now = Date.now();
    const tenant = typeof keyParts?.[1] === 'string' ? keyParts[1] : 'unknown';
    const store = redis ? 'redis' : 'memory';
    // Memory fallback first
    const local = memoryCache.get(key);
    if (local && now - local.ts < local.ttl * 1000) {
        recHit('memory', op, tenant);
        return local.val;
    }
    if (redis) {
        try {
            const hit = await redis.get(key);
            if (hit) {
                const parsed = JSON.parse(hit);
                recHit('redis', op, tenant);
                memoryCache.set(key, { ts: now, ttl: ttlSec, val: parsed });
                return parsed;
            }
            const val = await fetcher();
            await redis.set(key, JSON.stringify(val), { EX: ttlSec, NX: true });
            recSet('redis', op, tenant);
            // index by first part (prefix) and optional tenant
            try {
                const prefix = String(keyParts?.[0] ?? 'misc');
                await redis.sAdd(`idx:${prefix}`, key);
                if (keyParts?.[1])
                    await redis.sAdd(`idx:${prefix}:${keyParts[1]}`, key);
            }
            catch { }
            memoryCache.set(key, { ts: now, ttl: ttlSec, val });
            return val;
        }
        catch {
            // ignore and fall back to memory
        }
    }
    const val = await fetcher();
    memoryCache.set(key, { ts: now, ttl: ttlSec, val });
    recMiss(store, op, tenant);
    recSet('memory', op, tenant);
    cacheLocalSize.labels('default').set(memoryCache.size);
    return val;
}
//# sourceMappingURL=responseCache.js.map