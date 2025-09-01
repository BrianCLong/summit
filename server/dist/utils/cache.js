import crypto from 'crypto';
import { getRedisClient } from '../db/redis.js';
export function makeCacheKey(prefix, args, userId) {
    const hash = crypto.createHash('sha1').update(JSON.stringify(args)).digest('hex');
    return `${prefix}:${userId || 'anon'}:${hash}`;
}
export async function getCached(key) {
    const redis = getRedisClient();
    try {
        const val = await redis.get(key);
        return val ? JSON.parse(val) : null;
    }
    catch {
        return null;
    }
}
export async function setCached(key, value, ttl) {
    const redis = getRedisClient();
    try {
        await redis.set(key, JSON.stringify(value), 'EX', ttl);
    }
    catch {
        // ignore
    }
}
//# sourceMappingURL=cache.js.map