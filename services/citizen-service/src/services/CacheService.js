"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheService = exports.CacheService = void 0;
// @ts-nocheck
const cache_1 = require("@packages/cache");
const pino_1 = __importDefault(require("pino"));
const logger = (0, pino_1.default)({ name: 'citizen-cache' });
/**
 * Redis-based caching for citizen data
 * Improves performance for frequently accessed profiles
 */
class CacheService {
    redisUrl;
    cache;
    prefix = 'citizen:';
    defaultTTL = 3600; // 1 hour
    constructor(redisUrl = process.env.REDIS_URL || 'redis://localhost:6379') {
        this.redisUrl = redisUrl;
        this.cache = (0, cache_1.createCacheClient)({
            redisUrl: this.redisUrl,
            namespace: 'citizen-service',
            cacheClass: 'critical_path',
            defaultTTLSeconds: this.defaultTTL,
            logger,
        });
    }
    async connect() {
        if (process.env.CACHE_DISABLED === 'true') {
            logger.warn('Cache disabled via env switch');
            return;
        }
        const healthy = await this.cache.ping();
        if (!healthy) {
            logger.warn('Redis connection failed, running with in-memory cache');
        }
        else {
            logger.info('Connected to cache backend');
        }
    }
    async disconnect() {
        await this.cache.close();
    }
    async getCitizen(id) {
        const cached = await this.cache.get(`${this.prefix}${id}`);
        if (!cached)
            return null;
        try {
            return typeof cached === 'string' ? JSON.parse(cached) : cached;
        }
        catch (error) {
            logger.warn({ error, id }, 'Cache parse failed');
            return null;
        }
    }
    async setCitizen(citizen, ttl = this.defaultTTL) {
        await this.cache.set(`${this.prefix}${citizen.id}`, citizen, {
            ttlSeconds: ttl,
            cacheClass: 'critical_path',
            namespace: 'citizen-service',
        });
        await this.cache.set(`${this.prefix}national:${citizen.nationalId}`, citizen.id, {
            ttlSeconds: ttl,
            cacheClass: 'critical_path',
            namespace: 'citizen-service',
        });
        logger.debug({ id: citizen.id }, 'Cached citizen');
    }
    async invalidate(id) {
        await this.cache.delete(`${this.prefix}${id}`, {
            cacheClass: 'critical_path',
            namespace: 'citizen-service',
        });
        logger.debug({ id }, 'Cache invalidated');
    }
    async getByNationalId(nationalId) {
        return this.cache.get(`${this.prefix}national:${nationalId}`);
    }
    async healthCheck() {
        const start = Date.now();
        const healthy = await this.cache.ping();
        return { status: healthy ? 'pass' : 'fail', latency: Date.now() - start };
    }
    isConnected() {
        return this.cache.isRedisConnected();
    }
}
exports.CacheService = CacheService;
exports.cacheService = new CacheService();
