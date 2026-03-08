"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const AdvancedCachingStrategy_js_1 = require("../AdvancedCachingStrategy.js");
const globals_1 = require("@jest/globals");
// Mock Redis Client
const mockRedisClient = {
    get: globals_1.jest.fn(),
    set: globals_1.jest.fn(),
    setex: globals_1.jest.fn(),
    del: globals_1.jest.fn(),
    keys: globals_1.jest.fn(),
    scan: globals_1.jest.fn(),
    publish: globals_1.jest.fn(),
    on: globals_1.jest.fn(),
    pipeline: globals_1.jest.fn(() => ({
        setex: globals_1.jest.fn(),
        exec: globals_1.jest.fn(),
    })),
    quit: globals_1.jest.fn(),
};
(0, globals_1.describe)('AdvancedCachingStrategy', () => {
    let cacheManager;
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        cacheManager = new AdvancedCachingStrategy_js_1.CacheManager(mockRedisClient, {
            defaultTtl: 60,
            maxL1Entries: 10,
        });
    });
    (0, globals_1.afterEach)(async () => {
        await cacheManager.shutdown();
    });
    (0, globals_1.describe)('L1 Cache (In-Memory)', () => {
        (0, globals_1.it)('should store and retrieve values from L1 cache', async () => {
            await cacheManager.set('key1', 'value1', { skipL2: true });
            const value = await cacheManager.get('key1', { skipL2: true });
            (0, globals_1.expect)(value).toBe('value1');
        });
        (0, globals_1.it)('should respect TTL in L1 cache', async () => {
            // Set with short TTL
            await cacheManager.set('key1', 'value1', { ttl: 0.1, skipL2: true }); // 100ms
            // Immediate retrieval
            let value = await cacheManager.get('key1', { skipL2: true });
            (0, globals_1.expect)(value).toBe('value1');
            // Wait for expiration
            await new Promise(resolve => setTimeout(resolve, 150));
            value = await cacheManager.get('key1', { skipL2: true });
            (0, globals_1.expect)(value).toBeNull();
        });
        (0, globals_1.it)('should evict items when L1 is full (LRU)', async () => {
            // Initialize with small size
            cacheManager = new AdvancedCachingStrategy_js_1.CacheManager(mockRedisClient, {
                maxL1Entries: 2,
                l1EvictionPolicy: 'lru'
            });
            await cacheManager.set('k1', 'v1', { skipL2: true });
            await cacheManager.set('k2', 'v2', { skipL2: true });
            // Access k1 to make k2 the LRU
            await cacheManager.get('k1', { skipL2: true });
            // Add k3, which should evict k2
            await cacheManager.set('k3', 'v3', { skipL2: true });
            (0, globals_1.expect)(await cacheManager.get('k1', { skipL2: true })).toBe('v1');
            (0, globals_1.expect)(await cacheManager.get('k3', { skipL2: true })).toBe('v3');
            (0, globals_1.expect)(await cacheManager.get('k2', { skipL2: true })).toBeNull();
        });
    });
    (0, globals_1.describe)('L2 Cache (Redis)', () => {
        (0, globals_1.it)('should fallback to L2 if L1 misses', async () => {
            const entry = {
                value: 'redis-value',
                createdAt: Date.now(),
                expiresAt: Date.now() + 10000,
                accessCount: 0,
                lastAccessedAt: Date.now(),
                tags: [],
                version: 1,
            };
            mockRedisClient.get.mockResolvedValue(JSON.stringify(entry));
            const value = await cacheManager.get('missing-in-l1');
            (0, globals_1.expect)(value).toBe('redis-value');
            (0, globals_1.expect)(mockRedisClient.get).toHaveBeenCalledWith('ig:cache:missing-in-l1');
        });
        (0, globals_1.it)('should populate L1 after L2 hit', async () => {
            const entry = {
                value: 'redis-value',
                createdAt: Date.now(),
                expiresAt: Date.now() + 10000,
                accessCount: 0,
                lastAccessedAt: Date.now(),
                tags: [],
                version: 1,
            };
            mockRedisClient.get.mockResolvedValue(JSON.stringify(entry));
            await cacheManager.get('key1');
            // Second call should hit L1 (no redis call)
            mockRedisClient.get.mockClear();
            const value = await cacheManager.get('key1');
            (0, globals_1.expect)(value).toBe('redis-value');
            (0, globals_1.expect)(mockRedisClient.get).not.toHaveBeenCalled();
        });
        (0, globals_1.it)('should write to both L1 and L2 on set', async () => {
            await cacheManager.set('key1', 'value1');
            // Check L1
            const l1Value = await cacheManager.get('key1', { skipL2: true });
            (0, globals_1.expect)(l1Value).toBe('value1');
            // Check L2
            (0, globals_1.expect)(mockRedisClient.setex).toHaveBeenCalled();
        });
    });
    (0, globals_1.describe)('Cache Invalidation', () => {
        (0, globals_1.it)('should delete from both L1 and L2', async () => {
            await cacheManager.set('key1', 'value1');
            await cacheManager.delete('key1');
            (0, globals_1.expect)(await cacheManager.get('key1', { skipL2: true })).toBeNull();
            (0, globals_1.expect)(mockRedisClient.del).toHaveBeenCalledWith('ig:cache:key1');
        });
    });
});
