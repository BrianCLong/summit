"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cache = void 0;
const logger_js_1 = require("./logger.js");
const redis = new ioredis_1.Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
});
redis.on('error', (err) => {
    logger_js_1.logger.error('Redis connection error', { error: err.message });
});
redis.on('connect', () => {
    logger_js_1.logger.info('Redis connected');
});
exports.cache = {
    async get(key) {
        try {
            const value = await redis.get(key);
            return value ? JSON.parse(value) : null;
        }
        catch (err) {
            logger_js_1.logger.warn('Cache get failed', { key, error: err.message });
            return null;
        }
    },
    async set(key, value, ttlSeconds) {
        try {
            const serialized = JSON.stringify(value);
            if (ttlSeconds) {
                await redis.setex(key, ttlSeconds, serialized);
            }
            else {
                await redis.set(key, serialized);
            }
        }
        catch (err) {
            logger_js_1.logger.warn('Cache set failed', { key, error: err.message });
        }
    },
    async del(key) {
        try {
            await redis.del(key);
        }
        catch (err) {
            logger_js_1.logger.warn('Cache del failed', { key, error: err.message });
        }
    },
    async delPattern(pattern) {
        try {
            const keys = await redis.keys(pattern);
            if (keys.length > 0) {
                await redis.del(...keys);
            }
        }
        catch (err) {
            logger_js_1.logger.warn('Cache delPattern failed', { pattern, error: err.message });
        }
    },
    // Distributed lock for transactions
    async acquireLock(key, ttlMs = 5000) {
        const lockId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const result = await redis.set(`lock:${key}`, lockId, 'PX', ttlMs, 'NX');
        return result === 'OK' ? lockId : null;
    },
    async releaseLock(key, lockId) {
        const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
        const result = await redis.eval(script, 1, `lock:${key}`, lockId);
        return result === 1;
    },
    // Rate limiting
    async checkRateLimit(key, limit, windowSeconds) {
        const current = await redis.incr(key);
        if (current === 1) {
            await redis.expire(key, windowSeconds);
        }
        return {
            allowed: current <= limit,
            remaining: Math.max(0, limit - current),
        };
    },
    // Get underlying client for advanced operations
    getClient() {
        return redis;
    },
};
// Graceful shutdown
process.on('SIGTERM', async () => {
    await redis.quit();
});
