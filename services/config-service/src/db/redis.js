"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeRedis = initializeRedis;
exports.getRedis = getRedis;
exports.closeRedis = closeRedis;
exports.configCacheKey = configCacheKey;
exports.flagCacheKey = flagCacheKey;
exports.experimentCacheKey = experimentCacheKey;
exports.segmentCacheKey = segmentCacheKey;
exports.cacheGet = cacheGet;
exports.cacheSet = cacheSet;
exports.cacheDelete = cacheDelete;
exports.cacheDeletePattern = cacheDeletePattern;
exports.publishInvalidation = publishInvalidation;
exports.subscribeToInvalidations = subscribeToInvalidations;
exports.healthCheck = healthCheck;
const ioredis_1 = __importDefault(require("ioredis"));
const logger_js_1 = require("../utils/logger.js");
// Create a properly typed constructor reference
const Redis = ioredis_1.default;
const log = logger_js_1.logger.child({ module: 'redis' });
let redisClient = null;
let subscriberClient = null;
const CONFIG_CACHE_PREFIX = 'config:';
const FLAG_CACHE_PREFIX = 'flag:';
const EXPERIMENT_CACHE_PREFIX = 'exp:';
const SEGMENT_CACHE_PREFIX = 'seg:';
const INVALIDATION_CHANNEL = 'config-service:invalidation';
const DEFAULT_TTL_SECONDS = 300; // 5 minutes
function getDefaultConfig() {
    return {
        host: process.env.CONFIG_REDIS_HOST || process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.CONFIG_REDIS_PORT || process.env.REDIS_PORT || '6379', 10),
        password: process.env.CONFIG_REDIS_PASSWORD || process.env.REDIS_PASSWORD || undefined,
        db: parseInt(process.env.CONFIG_REDIS_DB || '0', 10),
        keyPrefix: process.env.CONFIG_REDIS_PREFIX || 'cfg:',
    };
}
function initializeRedis(config) {
    if (redisClient) {
        return redisClient;
    }
    const fullConfig = { ...getDefaultConfig(), ...config };
    redisClient = new Redis({
        host: fullConfig.host,
        port: fullConfig.port,
        password: fullConfig.password,
        db: fullConfig.db,
        keyPrefix: fullConfig.keyPrefix,
        connectTimeout: 5000,
        lazyConnect: true,
        retryStrategy: (times) => {
            if (times > 3) {
                log.warn({ times }, 'Redis connection failed, giving up');
                return null;
            }
            return Math.min(times * 100, 2000);
        },
    });
    redisClient.on('connect', () => log.info('Redis client connected'));
    redisClient.on('error', (err) => log.error({ err }, 'Redis client error'));
    redisClient.on('close', () => log.warn('Redis connection closed'));
    return redisClient;
}
function getRedis() {
    if (!redisClient) {
        return initializeRedis();
    }
    return redisClient;
}
async function closeRedis() {
    if (subscriberClient) {
        await subscriberClient.quit();
        subscriberClient = null;
    }
    if (redisClient) {
        await redisClient.quit();
        redisClient = null;
        log.info('Redis client closed');
    }
}
// Cache key builders
function configCacheKey(key, tenantId, environment, userId) {
    const parts = [CONFIG_CACHE_PREFIX, key];
    if (environment)
        parts.push(`env:${environment}`);
    if (tenantId)
        parts.push(`t:${tenantId}`);
    if (userId)
        parts.push(`u:${userId}`);
    return parts.join(':');
}
function flagCacheKey(key, tenantId) {
    return tenantId
        ? `${FLAG_CACHE_PREFIX}${key}:t:${tenantId}`
        : `${FLAG_CACHE_PREFIX}${key}`;
}
function experimentCacheKey(key, tenantId) {
    return tenantId
        ? `${EXPERIMENT_CACHE_PREFIX}${key}:t:${tenantId}`
        : `${EXPERIMENT_CACHE_PREFIX}${key}`;
}
function segmentCacheKey(id) {
    return `${SEGMENT_CACHE_PREFIX}${id}`;
}
// Cache operations
async function cacheGet(key) {
    try {
        const redis = getRedis();
        const data = await redis.get(key);
        if (!data)
            return null;
        return JSON.parse(data);
    }
    catch (err) {
        log.warn({ err, key }, 'Cache get failed');
        return null;
    }
}
async function cacheSet(key, value, ttlSeconds = DEFAULT_TTL_SECONDS) {
    try {
        const redis = getRedis();
        await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    }
    catch (err) {
        log.warn({ err, key }, 'Cache set failed');
    }
}
async function cacheDelete(key) {
    try {
        const redis = getRedis();
        await redis.del(key);
    }
    catch (err) {
        log.warn({ err, key }, 'Cache delete failed');
    }
}
async function cacheDeletePattern(pattern) {
    try {
        const redis = getRedis();
        const fullPattern = (redis.options.keyPrefix || '') + pattern;
        const keys = await redis.keys(fullPattern);
        if (keys.length > 0) {
            // Strip prefix since del will add it
            const strippedKeys = keys.map((k) => k.replace(redis.options.keyPrefix || '', ''));
            await redis.del(...strippedKeys);
            log.debug({ pattern, count: keys.length }, 'Cache pattern deleted');
        }
    }
    catch (err) {
        log.warn({ err, pattern }, 'Cache pattern delete failed');
    }
}
// Cache invalidation pub/sub
async function publishInvalidation(message) {
    try {
        const redis = getRedis();
        await redis.publish(INVALIDATION_CHANNEL, JSON.stringify(message));
        log.debug({ message }, 'Published cache invalidation');
    }
    catch (err) {
        log.warn({ err }, 'Failed to publish cache invalidation');
    }
}
async function subscribeToInvalidations(handler) {
    if (subscriberClient) {
        log.warn('Already subscribed to invalidations');
        return;
    }
    const config = getDefaultConfig();
    subscriberClient = new Redis({
        host: config.host,
        port: config.port,
        password: config.password,
        db: config.db,
        connectTimeout: 5000,
        lazyConnect: true,
    });
    subscriberClient.on('error', (err) => log.error({ err }, 'Redis subscriber error'));
    await subscriberClient.subscribe(INVALIDATION_CHANNEL);
    subscriberClient.on('message', (channel, message) => {
        if (channel === INVALIDATION_CHANNEL) {
            try {
                const parsed = JSON.parse(message);
                handler(parsed);
            }
            catch (err) {
                log.warn({ err, message }, 'Failed to parse invalidation message');
            }
        }
    });
    log.info('Subscribed to cache invalidation channel');
}
async function healthCheck() {
    try {
        const redis = getRedis();
        const result = await redis.ping();
        return result === 'PONG';
    }
    catch {
        return false;
    }
}
