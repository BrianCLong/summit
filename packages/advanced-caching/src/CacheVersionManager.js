"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheVersionManager = void 0;
const api_1 = require("@opentelemetry/api");
const pino_1 = __importDefault(require("pino"));
const logger = (0, pino_1.default)({ name: 'CacheVersionManager' });
const tracer = api_1.trace.getTracer('advanced-caching');
/**
 * Manages cache versioning for safe updates
 */
class CacheVersionManager {
    cache;
    redis;
    currentVersions = new Map();
    constructor(cache, redis) {
        this.cache = cache;
        this.redis = redis;
        if (redis) {
            this.loadVersions();
        }
    }
    /**
     * Get current version for a key
     */
    async getVersion(key) {
        // Check local cache first
        if (this.currentVersions.has(key)) {
            return this.currentVersions.get(key);
        }
        // Check Redis
        if (this.redis) {
            const version = await this.redis.get(`cache:version:${key}`);
            if (version) {
                const v = parseInt(version, 10);
                this.currentVersions.set(key, v);
                return v;
            }
        }
        // Default to version 1
        return 1;
    }
    /**
     * Increment version (invalidates old cached versions)
     */
    async incrementVersion(key) {
        const span = tracer.startSpan('CacheVersionManager.incrementVersion');
        try {
            const currentVersion = await this.getVersion(key);
            const newVersion = currentVersion + 1;
            // Update local cache
            this.currentVersions.set(key, newVersion);
            // Update Redis
            if (this.redis) {
                await this.redis.set(`cache:version:${key}`, newVersion.toString());
            }
            // Invalidate old cached values
            await this.cache.delete(key);
            span.setAttributes({
                key,
                oldVersion: currentVersion,
                newVersion,
            });
            logger.info({ key, version: newVersion }, 'Cache version incremented');
            return newVersion;
        }
        catch (error) {
            span.recordException(error);
            throw error;
        }
        finally {
            span.end();
        }
    }
    /**
     * Set specific version
     */
    async setVersion(key, version) {
        this.currentVersions.set(key, version);
        if (this.redis) {
            await this.redis.set(`cache:version:${key}`, version.toString());
        }
        logger.debug({ key, version }, 'Cache version set');
    }
    /**
     * Check if cached value version is current
     */
    async isVersionCurrent(key, cachedVersion) {
        if (!cachedVersion) {
            return false;
        }
        const currentVersion = await this.getVersion(key);
        return cachedVersion === currentVersion;
    }
    /**
     * Get versioned key
     */
    getVersionedKey(key, version) {
        const v = version || this.currentVersions.get(key) || 1;
        return `${key}:v${v}`;
    }
    /**
     * Batch increment versions
     */
    async incrementVersions(keys) {
        await Promise.all(keys.map((key) => this.incrementVersion(key)));
        logger.info({ count: keys.length }, 'Batch version increment completed');
    }
    /**
     * Increment version by pattern
     */
    async incrementVersionsByPattern(pattern) {
        const span = tracer.startSpan('CacheVersionManager.incrementVersionsByPattern');
        try {
            if (!this.redis) {
                throw new Error('Redis required for pattern operations');
            }
            const versionKeys = await this.redis.keys(`cache:version:${pattern}`);
            const keys = versionKeys.map((k) => k.replace('cache:version:', ''));
            await this.incrementVersions(keys);
            span.setAttribute('count', keys.length);
            return keys.length;
        }
        catch (error) {
            span.recordException(error);
            throw error;
        }
        finally {
            span.end();
        }
    }
    /**
     * Load versions from Redis
     */
    async loadVersions() {
        if (!this.redis)
            return;
        if (!this.redis) {
            return;
        }
        try {
            const keys = await this.redis.keys('cache:version:*');
            for (const key of keys) {
                const cacheKey = key.replace('cache:version:', '');
                const version = await this.redis.get(key);
                if (version) {
                    this.currentVersions.set(cacheKey, parseInt(version, 10));
                }
            }
            logger.info({ count: keys.length }, 'Cache versions loaded');
        }
        catch (error) {
            logger.error({ error }, 'Failed to load cache versions');
        }
    }
    /**
     * Clear all versions
     */
    async clear() {
        this.currentVersions.clear();
        if (this.redis) {
            const keys = await this.redis.keys('cache:version:*');
            if (keys.length > 0) {
                await this.redis.del(...keys);
            }
        }
        logger.info('Cache versions cleared');
    }
    /**
     * Get version statistics
     */
    getStats() {
        return {
            totalKeys: this.currentVersions.size,
            versions: Array.from(this.currentVersions.entries()).map(([key, version]) => ({ key, version })),
        };
    }
}
exports.CacheVersionManager = CacheVersionManager;
