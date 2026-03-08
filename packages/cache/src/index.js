"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheClient = void 0;
exports.createCacheClient = createCacheClient;
const ioredis_1 = __importDefault(require("ioredis"));
const prom_client_1 = require("prom-client");
const DEFAULT_TTLS = {
    critical_path: 120,
    best_effort: 600,
    static_metadata: 43200,
};
class MemoryCacheBackend {
    onEvict;
    store = new Map();
    constructor(onEvict) {
        this.onEvict = onEvict;
    }
    async get(key) {
        const entry = this.store.get(key);
        if (!entry)
            return null;
        if (entry.expiresAt && entry.expiresAt <= Date.now()) {
            this.store.delete(key);
            this.onEvict?.(entry.metadata);
            return null;
        }
        return entry.value;
    }
    async set(key, value, ttlSeconds, metadata) {
        const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined;
        this.store.set(key, { value, expiresAt, metadata });
    }
    async delete(key) {
        const entry = this.store.get(key);
        const deleted = this.store.delete(key);
        if (deleted) {
            this.onEvict?.(entry?.metadata);
        }
    }
}
class RedisCacheBackend {
    clients;
    constructor(clientOrClients) {
        this.clients = Array.isArray(clientOrClients) ? clientOrClients : [clientOrClients];
    }
    getClient(key) {
        if (this.clients.length === 1)
            return this.clients[0];
        // Simple hash-based partitioning
        let hash = 0;
        for (let i = 0; i < key.length; i++) {
            hash = ((hash << 5) - hash) + key.charCodeAt(i);
            hash |= 0; // Convert to 32bit int
        }
        const index = Math.abs(hash) % this.clients.length;
        return this.clients[index];
    }
    async get(key) {
        const client = this.getClient(key);
        const value = await client.get(key);
        if (value === null)
            return null;
        try {
            return JSON.parse(value);
        }
        catch {
            return value;
        }
    }
    async set(key, value, ttlSeconds, _metadata) {
        const client = this.getClient(key);
        const payload = typeof value === 'string' ? value : JSON.stringify(value);
        if (ttlSeconds) {
            await client.setex(key, ttlSeconds, payload);
        }
        else {
            await client.set(key, payload);
        }
    }
    async delete(key) {
        const client = this.getClient(key);
        await client.del(key);
    }
    async close() {
        await Promise.all(this.clients.map(client => client.quit()));
    }
    async ping() {
        await Promise.all(this.clients.map(client => client.ping()));
    }
    isConnected() {
        return this.clients.every(client => client.status === 'ready');
    }
}
function getOrCreateCounter(registry, name, help) {
    const existing = registry.getSingleMetric(name);
    if (existing)
        return existing;
    return new prom_client_1.Counter({
        name,
        help,
        labelNames: ['namespace', 'class'],
        registers: [registry],
    });
}
class CacheClient {
    config;
    registry;
    metricsEnabled;
    hitsCounter;
    missesCounter;
    evictionsCounter;
    memoryBackend;
    redisBackend;
    defaultNamespace;
    defaultClass;
    defaultTTLSeconds;
    disableEnvKey;
    fallbackToMemory;
    devTtlCapSeconds;
    env;
    logger;
    constructor(config = {}) {
        this.config = config;
        this.env = config.env ?? process.env.NODE_ENV ?? 'development';
        this.disableEnvKey = config.disableEnvKey ?? 'CACHE_DISABLED';
        this.defaultNamespace = config.namespace ?? 'global';
        this.defaultClass = config.cacheClass ?? 'best_effort';
        this.defaultTTLSeconds = config.defaultTTLSeconds;
        this.fallbackToMemory = config.fallbackToMemory ?? true;
        this.devTtlCapSeconds = config.devTtlCapSeconds ?? 300;
        this.logger = config.logger ?? console;
        this.registry = config.registry ?? prom_client_1.register;
        this.metricsEnabled = !config.disableMetrics;
        if (this.metricsEnabled) {
            // Collect default metrics once for this registry.
            try {
                (0, prom_client_1.collectDefaultMetrics)({ register: this.registry });
            }
            catch {
                // ignore duplicate collectors
            }
        }
        this.hitsCounter = getOrCreateCounter(this.registry, 'cache_hits_total', 'Total cache hits by namespace and class');
        this.missesCounter = getOrCreateCounter(this.registry, 'cache_misses_total', 'Total cache misses by namespace and class');
        this.evictionsCounter = getOrCreateCounter(this.registry, 'cache_evictions_total', 'Total cache evictions by namespace and class');
        this.memoryBackend = new MemoryCacheBackend((metadata) => {
            if (!metadata)
                return;
            this.evictionsCounter.inc({ namespace: metadata.namespace, class: metadata.cacheClass });
        });
        if (config.redis || config.redisUrl) {
            const redisUrls = config.redisUrl ? config.redisUrl.split(',') : [];
            let redisClients = [];
            if (config.redis) {
                redisClients = Array.isArray(config.redis) ? config.redis : [config.redis];
            }
            else if (redisUrls.length > 0) {
                redisClients = redisUrls.map(url => new ioredis_1.default(url, {
                    lazyConnect: true,
                    maxRetriesPerRequest: 2,
                    enableOfflineQueue: false,
                }));
            }
            if (redisClients.length > 0) {
                this.redisBackend = new RedisCacheBackend(redisClients);
            }
        }
    }
    get disabled() {
        return process.env[this.disableEnvKey] === 'true';
    }
    namespacedKey(namespace, key) {
        return `${namespace}:${key}`;
    }
    resolveTTL(cacheClass, override) {
        const baseTtl = override ?? this.defaultTTLSeconds ?? DEFAULT_TTLS[cacheClass] ?? DEFAULT_TTLS.best_effort;
        if (this.env !== 'production' && baseTtl) {
            return Math.min(baseTtl, this.devTtlCapSeconds);
        }
        return baseTtl;
    }
    async useBackend(backend, operation) {
        if (backend === this.memoryBackend) {
            return operation(backend);
        }
        try {
            return await operation(backend);
        }
        catch (error) {
            this.logger.warn?.({ error }, 'Cache backend failed, using memory fallback');
            if (this.fallbackToMemory) {
                return operation(this.memoryBackend);
            }
            throw error;
        }
    }
    normalizeOptions(options) {
        return {
            namespace: options?.namespace ?? this.defaultNamespace,
            cacheClass: options?.cacheClass ?? this.defaultClass,
        };
    }
    async get(key, options) {
        const { namespace, cacheClass } = this.normalizeOptions(options);
        const namespacedKey = this.namespacedKey(namespace, key);
        if (this.disabled) {
            this.missesCounter.inc({ namespace, class: cacheClass });
            return null;
        }
        const backend = this.redisBackend ?? this.memoryBackend;
        const result = await this.useBackend(backend, async (target) => target.get(namespacedKey));
        if (result === null) {
            this.missesCounter.inc({ namespace, class: cacheClass });
        }
        else {
            this.hitsCounter.inc({ namespace, class: cacheClass });
        }
        return result;
    }
    async set(key, value, options) {
        const { namespace, cacheClass } = this.normalizeOptions(options);
        const ttlSeconds = this.resolveTTL(cacheClass, options?.ttlSeconds);
        const namespacedKey = this.namespacedKey(namespace, key);
        if (this.disabled)
            return;
        const backend = this.redisBackend ?? this.memoryBackend;
        await this.useBackend(backend, async (target) => target.set(namespacedKey, value, ttlSeconds, { namespace, cacheClass }));
    }
    async delete(key, options) {
        const { namespace, cacheClass } = this.normalizeOptions(options);
        const namespacedKey = this.namespacedKey(namespace, key);
        const backend = this.redisBackend ?? this.memoryBackend;
        let targetBackend = backend;
        await this.useBackend(backend, async (target) => {
            targetBackend = target;
            return target.delete(namespacedKey);
        });
        if (targetBackend !== this.memoryBackend) {
            this.evictionsCounter.inc({ namespace, class: cacheClass });
        }
    }
    async ping() {
        if (this.disabled || !this.redisBackend)
            return false;
        try {
            await this.redisBackend.ping?.();
            return true;
        }
        catch (error) {
            this.logger.warn?.({ error }, 'Cache ping failed');
            return false;
        }
    }
    async close() {
        await this.redisBackend?.close?.();
    }
    isRedisConnected() {
        return Boolean(this.redisBackend?.isConnected?.());
    }
}
exports.CacheClient = CacheClient;
function createCacheClient(config = {}) {
    return new CacheClient(config);
}
