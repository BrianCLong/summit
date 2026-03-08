"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const cache_client_js_1 = require("../cache-client.js");
function createMockProvider(name) {
    const store = new Map();
    return {
        name,
        isAvailable: vitest_1.vi.fn().mockResolvedValue(true),
        get: vitest_1.vi.fn().mockImplementation(async (key) => {
            const entry = store.get(key);
            if (!entry || entry.expiresAt < Date.now()) {
                store.delete(key);
                return null;
            }
            return entry.value;
        }),
        set: vitest_1.vi.fn().mockImplementation(async (key, value, ttl) => {
            const expiresAt = Date.now() + (ttl ?? 300) * 1000;
            store.set(key, { value, expiresAt });
        }),
        delete: vitest_1.vi.fn().mockImplementation(async (key) => {
            return store.delete(key);
        }),
        exists: vitest_1.vi.fn().mockImplementation(async (key) => {
            const entry = store.get(key);
            return entry !== undefined && entry.expiresAt > Date.now();
        }),
        deletePattern: vitest_1.vi.fn().mockImplementation(async (pattern) => {
            const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
            let count = 0;
            for (const key of store.keys()) {
                if (regex.test(key)) {
                    store.delete(key);
                    count++;
                }
            }
            return count;
        }),
        mget: vitest_1.vi.fn().mockImplementation(async (keys) => {
            return Promise.all(keys.map(async (key) => {
                const entry = store.get(key);
                if (!entry || entry.expiresAt < Date.now()) {
                    return null;
                }
                return entry.value;
            }));
        }),
        mset: vitest_1.vi.fn().mockImplementation(async (entries) => {
            for (const entry of entries) {
                const expiresAt = Date.now() + (entry.ttl ?? 300) * 1000;
                store.set(entry.key, { value: entry.value, expiresAt });
            }
        }),
        ttl: vitest_1.vi.fn().mockImplementation(async (key) => {
            const entry = store.get(key);
            if (!entry)
                return -2;
            const remaining = Math.floor((entry.expiresAt - Date.now()) / 1000);
            return remaining > 0 ? remaining : -1;
        }),
        close: vitest_1.vi.fn().mockResolvedValue(undefined),
    };
}
function createMockMetrics() {
    return {
        recordHit: vitest_1.vi.fn(),
        recordMiss: vitest_1.vi.fn(),
        recordGetLatency: vitest_1.vi.fn(),
        recordSetLatency: vitest_1.vi.fn(),
        getStats: vitest_1.vi.fn().mockReturnValue({
            hits: 0,
            misses: 0,
            hitRate: 0,
            localHits: 0,
            redisHits: 0,
            localSize: 0,
            redisKeys: 0,
            avgGetLatency: 0,
            avgSetLatency: 0,
        }),
        reset: vitest_1.vi.fn(),
    };
}
(0, vitest_1.describe)('CacheClient', () => {
    let localProvider;
    let redisProvider;
    let metrics;
    let config;
    let client;
    (0, vitest_1.beforeEach)(() => {
        localProvider = createMockProvider('local');
        redisProvider = createMockProvider('redis');
        metrics = createMockMetrics();
        config = {
            namespace: 'test',
            defaultTtl: 300,
            maxTtl: 3600,
            enableMetrics: true,
            local: {
                enabled: true,
                maxSize: 100,
                ttl: 60,
            },
            redis: {
                enabled: true,
                host: 'localhost',
                port: 6379,
                db: 0,
                keyPrefix: 'cache:',
                maxRetriesPerRequest: 3,
            },
        };
        client = new cache_client_js_1.CacheClient(config, localProvider, redisProvider, metrics);
    });
    (0, vitest_1.describe)('get', () => {
        (0, vitest_1.it)('should return null for non-existent keys', async () => {
            const result = await client.get('non-existent');
            (0, vitest_1.expect)(result).toBeNull();
            (0, vitest_1.expect)(metrics.recordMiss).toHaveBeenCalled();
        });
        (0, vitest_1.it)('should return value from local cache first', async () => {
            const testValue = { data: 'test' };
            const entry = {
                value: testValue,
                createdAt: Date.now(),
                expiresAt: Date.now() + 60000,
                source: 'local',
            };
            vitest_1.vi.mocked(localProvider.get).mockResolvedValueOnce(entry);
            const result = await client.get('test-key');
            (0, vitest_1.expect)(result).not.toBeNull();
            (0, vitest_1.expect)(result?.value).toEqual(testValue);
            (0, vitest_1.expect)(result?.source).toBe('local');
            (0, vitest_1.expect)(metrics.recordHit).toHaveBeenCalledWith('local');
        });
        (0, vitest_1.it)('should fallback to Redis when local cache misses', async () => {
            const testValue = { data: 'from-redis' };
            const entry = {
                value: testValue,
                createdAt: Date.now(),
                expiresAt: Date.now() + 60000,
                source: 'redis',
            };
            vitest_1.vi.mocked(localProvider.get).mockResolvedValueOnce(null);
            vitest_1.vi.mocked(redisProvider.get).mockResolvedValueOnce(entry);
            const result = await client.get('test-key');
            (0, vitest_1.expect)(result).not.toBeNull();
            (0, vitest_1.expect)(result?.value).toEqual(testValue);
            (0, vitest_1.expect)(result?.source).toBe('redis');
            (0, vitest_1.expect)(metrics.recordHit).toHaveBeenCalledWith('redis');
        });
        (0, vitest_1.it)('should skip local cache when option is set', async () => {
            const testValue = { data: 'from-redis' };
            const entry = {
                value: testValue,
                createdAt: Date.now(),
                expiresAt: Date.now() + 60000,
                source: 'redis',
            };
            vitest_1.vi.mocked(redisProvider.get).mockResolvedValueOnce(entry);
            const result = await client.get('test-key', { skipLocal: true });
            (0, vitest_1.expect)(result).not.toBeNull();
            (0, vitest_1.expect)(localProvider.get).not.toHaveBeenCalled();
        });
    });
    (0, vitest_1.describe)('set', () => {
        (0, vitest_1.it)('should set value in both caches', async () => {
            const testValue = { data: 'test' };
            await client.set('test-key', testValue);
            (0, vitest_1.expect)(localProvider.set).toHaveBeenCalled();
            (0, vitest_1.expect)(redisProvider.set).toHaveBeenCalled();
            (0, vitest_1.expect)(metrics.recordSetLatency).toHaveBeenCalled();
        });
        (0, vitest_1.it)('should respect TTL option', async () => {
            const testValue = { data: 'test' };
            await client.set('test-key', testValue, { ttl: 600 });
            (0, vitest_1.expect)(redisProvider.set).toHaveBeenCalledWith(vitest_1.expect.any(String), vitest_1.expect.objectContaining({ value: testValue }), 600);
        });
        (0, vitest_1.it)('should cap TTL to maxTtl', async () => {
            const testValue = { data: 'test' };
            await client.set('test-key', testValue, { ttl: 99999 });
            (0, vitest_1.expect)(redisProvider.set).toHaveBeenCalledWith(vitest_1.expect.any(String), vitest_1.expect.objectContaining({ value: testValue }), 3600 // maxTtl
            );
        });
        (0, vitest_1.it)('should skip local cache when option is set', async () => {
            const testValue = { data: 'test' };
            await client.set('test-key', testValue, { skipLocal: true });
            (0, vitest_1.expect)(localProvider.set).not.toHaveBeenCalled();
            (0, vitest_1.expect)(redisProvider.set).toHaveBeenCalled();
        });
    });
    (0, vitest_1.describe)('delete', () => {
        (0, vitest_1.it)('should delete from both caches', async () => {
            vitest_1.vi.mocked(localProvider.delete).mockResolvedValueOnce(true);
            vitest_1.vi.mocked(redisProvider.delete).mockResolvedValueOnce(true);
            const result = await client.delete('test-key');
            (0, vitest_1.expect)(result).toBe(true);
            (0, vitest_1.expect)(localProvider.delete).toHaveBeenCalled();
            (0, vitest_1.expect)(redisProvider.delete).toHaveBeenCalled();
        });
        (0, vitest_1.it)('should return true if any cache had the key', async () => {
            vitest_1.vi.mocked(localProvider.delete).mockResolvedValueOnce(false);
            vitest_1.vi.mocked(redisProvider.delete).mockResolvedValueOnce(true);
            const result = await client.delete('test-key');
            (0, vitest_1.expect)(result).toBe(true);
        });
    });
    (0, vitest_1.describe)('exists', () => {
        (0, vitest_1.it)('should check local cache first', async () => {
            vitest_1.vi.mocked(localProvider.exists).mockResolvedValueOnce(true);
            const result = await client.exists('test-key');
            (0, vitest_1.expect)(result).toBe(true);
            (0, vitest_1.expect)(redisProvider.exists).not.toHaveBeenCalled();
        });
        (0, vitest_1.it)('should fallback to Redis when not in local', async () => {
            vitest_1.vi.mocked(localProvider.exists).mockResolvedValueOnce(false);
            vitest_1.vi.mocked(redisProvider.exists).mockResolvedValueOnce(true);
            const result = await client.exists('test-key');
            (0, vitest_1.expect)(result).toBe(true);
        });
    });
    (0, vitest_1.describe)('getOrSet', () => {
        (0, vitest_1.it)('should return cached value when exists', async () => {
            const cachedValue = { data: 'cached' };
            const entry = {
                value: cachedValue,
                createdAt: Date.now(),
                expiresAt: Date.now() + 60000,
                source: 'local',
            };
            vitest_1.vi.mocked(localProvider.get).mockResolvedValueOnce(entry);
            const fetchFn = vitest_1.vi.fn().mockResolvedValue({ data: 'fresh' });
            const result = await client.getOrSet('test-key', fetchFn);
            (0, vitest_1.expect)(result.value).toEqual(cachedValue);
            (0, vitest_1.expect)(fetchFn).not.toHaveBeenCalled();
        });
        (0, vitest_1.it)('should fetch and cache when not exists', async () => {
            vitest_1.vi.mocked(localProvider.get).mockResolvedValueOnce(null);
            vitest_1.vi.mocked(redisProvider.get).mockResolvedValueOnce(null);
            const freshValue = { data: 'fresh' };
            const fetchFn = vitest_1.vi.fn().mockResolvedValue(freshValue);
            const result = await client.getOrSet('test-key', fetchFn);
            (0, vitest_1.expect)(result.value).toEqual(freshValue);
            (0, vitest_1.expect)(result.source).toBe('origin');
            (0, vitest_1.expect)(fetchFn).toHaveBeenCalled();
            (0, vitest_1.expect)(localProvider.set).toHaveBeenCalled();
            (0, vitest_1.expect)(redisProvider.set).toHaveBeenCalled();
        });
    });
    (0, vitest_1.describe)('invalidatePattern', () => {
        (0, vitest_1.it)('should delete matching keys', async () => {
            vitest_1.vi.mocked(redisProvider.deletePattern).mockResolvedValueOnce(5);
            const count = await client.invalidatePattern('user:*');
            (0, vitest_1.expect)(count).toBe(5);
        });
    });
    (0, vitest_1.describe)('getStats', () => {
        (0, vitest_1.it)('should return metrics stats', () => {
            const stats = client.getStats();
            (0, vitest_1.expect)(metrics.getStats).toHaveBeenCalled();
            (0, vitest_1.expect)(stats).toBeDefined();
        });
    });
    (0, vitest_1.describe)('close', () => {
        (0, vitest_1.it)('should close Redis provider', async () => {
            await client.close();
            (0, vitest_1.expect)(redisProvider.close).toHaveBeenCalled();
        });
    });
});
