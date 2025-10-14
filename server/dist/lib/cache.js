import Redis from 'ioredis';
import pino from 'pino';
const logger = pino();
const redisClient = new Redis(); // Assuming Redis is running and accessible
redisClient.on('connect', () => logger.info('Redis client connected for caching.'));
redisClient.on('error', (err) => logger.error({ err }, 'Redis caching client error.'));
// Simple metrics for cache
const metrics = {
    cacheHit: { inc: () => { } }, // Placeholder
    cacheMiss: { inc: () => { } }, // Placeholder
    cacheEviction: { inc: () => { } }, // Placeholder
};
export const cached = (key, ttl, fn) => async () => {
    const hit = await redisClient.get(key);
    if (hit) {
        metrics.cacheHit.inc();
        return JSON.parse(hit);
    }
    const val = await fn();
    await redisClient.setex(key, ttl, JSON.stringify(val));
    metrics.cacheMiss.inc();
    return val;
};
//# sourceMappingURL=cache.js.map