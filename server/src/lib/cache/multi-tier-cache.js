"use strict";
// @ts-nocheck
// NOTE: The 'lru-cache' package could not be installed due to a pre-existing
// dependency conflict in the monorepo (related to @react-native-firebase/app).
// A simplified, self-contained LRU cache with TTL is implemented here as a workaround
// to avoid getting blocked by the environment issue.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultiTierCache = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const pino_1 = __importDefault(require("pino"));
const config_js_1 = require("../../config.js");
const metrics_js_1 = require("../../observability/metrics.js");
const logger = pino_1.default();
const INVALIDATION_CHANNEL = 'cache:invalidation';
class SimpleLRUCache {
    maxSize;
    currentSize;
    cache;
    constructor(options) {
        this.maxSize = options.maxSize;
        this.currentSize = 0;
        this.cache = new Map();
    }
    calculateSize(key, value) {
        const keyString = String(key);
        const valueString = JSON.stringify(value);
        return (Buffer.byteLength(keyString, 'utf8') +
            Buffer.byteLength(valueString, 'utf8'));
    }
    get(key) {
        const entry = this.cache.get(key);
        if (!entry)
            return undefined;
        if (Date.now() > entry.expiry) {
            this.currentSize -= entry.size;
            this.cache.delete(key);
            return undefined;
        }
        this.cache.delete(key);
        this.cache.set(key, entry);
        return entry.value;
    }
    delete(key) {
        const entry = this.cache.get(key);
        if (entry) {
            this.currentSize -= entry.size;
            this.cache.delete(key);
        }
    }
    set(key, value, options) {
        const ttl = options?.ttl ?? Infinity;
        const size = this.calculateSize(key, value);
        if (size > this.maxSize) {
            logger.warn({ key, size, maxSize: this.maxSize }, 'Item is larger than the cache size and will not be stored.');
            return;
        }
        if (this.cache.has(key)) {
            const oldEntry = this.cache.get(key);
            this.currentSize -= oldEntry.size;
            this.cache.delete(key);
        }
        while (this.currentSize + size > this.maxSize && this.cache.size > 0) {
            const oldestKey = this.cache.keys().next().value;
            const oldestEntry = this.cache.get(oldestKey);
            this.currentSize -= oldestEntry.size;
            this.cache.delete(oldestKey);
        }
        const expiry = ttl === Infinity ? Infinity : Date.now() + ttl;
        this.cache.set(key, { value, expiry, size });
        this.currentSize += size;
    }
}
function createRedisClient() {
    try {
        const client = new ioredis_1.default({
            host: config_js_1.cfg.REDIS_HOST,
            port: config_js_1.cfg.REDIS_PORT,
            password: config_js_1.cfg.REDIS_PASSWORD,
        });
        client.on('connect', () => logger.info('Redis client connected for multi-tier cache.'));
        client.on('error', (err) => logger.error({ err }, 'Redis cache client error.'));
        return client;
    }
    catch (error) {
        logger.warn({ error }, 'Redis unavailable, using in-memory cache only.');
        return null;
    }
}
function buildPayload(value, ttlSeconds, tags) {
    return {
        value,
        tags,
        expiresAt: Date.now() + ttlSeconds * 1000,
    };
}
class MultiTierCache {
    namespace;
    defaultTtlSeconds;
    l1FallbackTtlMs;
    cacheEnabled;
    l1Cache;
    redis;
    subscriber;
    inflight = new Map();
    keyTags = new Map();
    tagIndex = new Map();
    constructor(options = {}) {
        this.namespace = options.namespace ?? 'cache';
        this.defaultTtlSeconds = options.defaultTtlSeconds ?? config_js_1.cfg.CACHE_TTL_DEFAULT;
        this.l1FallbackTtlMs =
            (options.l1FallbackTtlSeconds ?? config_js_1.cfg.L1_CACHE_FALLBACK_TTL_SECONDS) * 1000;
        this.cacheEnabled = options.cacheEnabled ?? config_js_1.cfg.CACHE_ENABLED;
        this.l1Cache = new SimpleLRUCache({
            maxSize: options.l1MaxBytes ?? config_js_1.cfg.L1_CACHE_MAX_BYTES,
        });
        this.redis = options.redisClient ?? createRedisClient();
        this.subscriber =
            options.subscriberClient ?? this.redis?.duplicate?.() ?? null;
        this.setupPubSub();
    }
    async get(key) {
        if (!this.cacheEnabled)
            return null;
        const namespacedKey = this.namespaced(key);
        const l1Value = this.l1Cache.get(namespacedKey);
        if (l1Value) {
            metrics_js_1.metrics.cacheHits.inc({ level: 'l1' });
            return l1Value.value;
        }
        const payload = await this.readFromRedis(namespacedKey);
        if (payload) {
            metrics_js_1.metrics.cacheHits.inc({ level: 'l3' });
            const remainingMs = payload.expiresAt - Date.now();
            const ttlMs = Math.min(remainingMs, this.l1FallbackTtlMs);
            this.l1Cache.set(namespacedKey, payload, { ttl: ttlMs });
            this.trackTags(namespacedKey, payload.tags);
            return payload.value;
        }
        metrics_js_1.metrics.cacheMisses.inc();
        return null;
    }
    async set(key, value, ttlOrOptions, tags) {
        if (!this.cacheEnabled)
            return;
        const { ttlSeconds, tags: resolvedTags } = this.normalizeSetOptions(ttlOrOptions, tags);
        const namespacedKey = this.namespaced(key);
        const payload = buildPayload(value, ttlSeconds, resolvedTags);
        this.l1Cache.set(namespacedKey, payload, { ttl: ttlSeconds * 1000 });
        this.trackTags(namespacedKey, resolvedTags);
        if (!this.redis)
            return;
        try {
            await this.redis.setex(namespacedKey, ttlSeconds, JSON.stringify(payload));
            await this.indexTags(namespacedKey, resolvedTags, ttlSeconds);
            await this.publishInvalidation({ type: 'key', keys: [namespacedKey] });
        }
        catch (error) {
            logger.error({ err: error, key: namespacedKey }, 'Failed to set key in cache');
        }
    }
    async wrap(key, factory, options) {
        const cached = await this.get(key);
        if (cached !== null)
            return cached;
        const namespacedKey = this.namespaced(key);
        if (this.inflight.has(namespacedKey)) {
            return (await this.inflight.get(namespacedKey));
        }
        const inflightPromise = (async () => {
            const value = await factory();
            await this.set(key, value, options);
            return value;
        })();
        this.inflight.set(namespacedKey, inflightPromise);
        try {
            return await inflightPromise;
        }
        finally {
            this.inflight.delete(namespacedKey);
        }
    }
    async invalidate(key) {
        const namespacedKey = this.namespaced(key);
        const cachedTags = this.keyTags.get(namespacedKey);
        this.evictLocal(namespacedKey);
        if (!this.redis)
            return;
        try {
            const tags = (await this.readTags(namespacedKey)) ?? cachedTags;
            await this.redis.del(namespacedKey);
            await this.cleanupTagIndexes(namespacedKey, tags);
            await this.publishInvalidation({ type: 'key', keys: [namespacedKey] });
        }
        catch (error) {
            logger.error({ err: error, key: namespacedKey }, 'Failed to invalidate key in cache');
        }
    }
    async invalidateByTag(tag) {
        const tagKey = this.tagIndexKey(tag);
        const keys = await this.collectKeysForTag(tagKey);
        keys.forEach((k) => this.evictLocal(k));
        if (!this.redis)
            return;
        try {
            if (keys.length > 0) {
                await this.redis.del(...keys);
            }
            await this.redis.del(tagKey);
            await this.publishInvalidation({ type: 'tag', tag, keys });
        }
        catch (error) {
            logger.error({ err: error, tag }, 'Failed to invalidate tag cache');
        }
    }
    async shutdown() {
        if (this.subscriber) {
            await this.subscriber.quit();
        }
        if (this.redis) {
            await this.redis.quit();
        }
    }
    namespaced(key) {
        return `${this.namespace}:${key}`;
    }
    tagIndexKey(tag) {
        return `${this.namespace}:tag:${tag}`;
    }
    normalizeSetOptions(ttlOrOptions, tags) {
        if (typeof ttlOrOptions === 'number') {
            return {
                ttlSeconds: ttlOrOptions,
                tags,
            };
        }
        return {
            ttlSeconds: ttlOrOptions?.ttlSeconds ?? this.defaultTtlSeconds,
            tags: ttlOrOptions?.tags ?? tags,
        };
    }
    trackTags(key, tags) {
        if (!tags || tags.length === 0)
            return;
        this.dropTagTracking(key);
        this.keyTags.set(key, tags);
        tags.forEach((tag) => {
            const entry = this.tagIndex.get(tag) ?? new Set();
            entry.add(key);
            this.tagIndex.set(tag, entry);
        });
    }
    evictLocal(key) {
        this.l1Cache.delete(key);
        this.dropTagTracking(key);
    }
    dropTagTracking(key) {
        const tags = this.keyTags.get(key);
        if (tags) {
            tags.forEach((tag) => {
                const entry = this.tagIndex.get(tag);
                if (!entry)
                    return;
                entry.delete(key);
                if (entry.size === 0) {
                    this.tagIndex.delete(tag);
                }
            });
        }
        this.keyTags.delete(key);
    }
    async readFromRedis(key) {
        if (!this.redis)
            return null;
        try {
            const raw = await this.redis.get(key);
            if (!raw)
                return null;
            const payload = JSON.parse(raw);
            if (payload.expiresAt <= Date.now()) {
                await this.redis.del(key);
                return null;
            }
            this.trackTags(key, payload.tags);
            return payload;
        }
        catch (error) {
            logger.error({ err: error, key }, 'Failed to read from cache');
            return null;
        }
    }
    async readTags(key) {
        if (!this.redis)
            return this.keyTags.get(key);
        try {
            const raw = await this.redis.get(key);
            if (!raw)
                return this.keyTags.get(key);
            const payload = JSON.parse(raw);
            return payload.tags;
        }
        catch (error) {
            logger.warn({ err: error, key }, 'Unable to read tags for key');
            return this.keyTags.get(key);
        }
    }
    async indexTags(key, tags, ttlSeconds) {
        if (!this.redis || !tags || tags.length === 0)
            return;
        await Promise.all(tags.map(async (tag) => {
            const tagKey = this.tagIndexKey(tag);
            await this.redis.sadd(tagKey, key);
            await this.redis.expire(tagKey, ttlSeconds);
        }));
    }
    async cleanupTagIndexes(key, tags) {
        if (!this.redis || !tags || tags.length === 0)
            return;
        await Promise.all(tags.map(async (tag) => {
            const tagKey = this.tagIndexKey(tag);
            await this.redis.srem(tagKey, key);
            const remaining = await this.redis.smembers(tagKey);
            if (remaining.length === 0) {
                await this.redis.del(tagKey);
            }
        }));
    }
    async collectKeysForTag(tagKey) {
        if (!this.redis) {
            const tag = tagKey.split(':').at(-1);
            if (!tag)
                return [];
            return Array.from(this.tagIndex.get(tag) ?? []);
        }
        try {
            const members = await this.redis.smembers(tagKey);
            return members.filter(Boolean);
        }
        catch (error) {
            logger.warn({ err: error, tagKey }, 'Failed to read tag index');
            return [];
        }
    }
    async publishInvalidation(message) {
        if (!this.redis)
            return;
        try {
            await this.redis.publish(INVALIDATION_CHANNEL, JSON.stringify(message));
        }
        catch (error) {
            logger.warn({ err: error, message }, 'Failed to publish invalidation');
        }
    }
    setupPubSub() {
        if (!this.subscriber)
            return;
        this.subscriber.on('message', (channel, message) => {
            if (channel !== INVALIDATION_CHANNEL)
                return;
            try {
                const payload = JSON.parse(message);
                if (payload.type === 'key') {
                    payload.keys.forEach((key) => this.evictLocal(key));
                }
                else if (payload.type === 'tag') {
                    payload.keys.forEach((key) => this.evictLocal(key));
                }
            }
            catch (error) {
                logger.warn({ err: error, message }, 'Failed to process invalidation');
            }
        });
        this.subscriber.subscribe(INVALIDATION_CHANNEL).catch((error) => logger.warn({ err: error }, 'Failed to subscribe to invalidation channel'));
    }
}
exports.MultiTierCache = MultiTierCache;
