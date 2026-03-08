"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
// Create mock cache manager
const mockCacheManager = {
    get: globals_1.jest.fn(),
    set: globals_1.jest.fn(),
    delete: globals_1.jest.fn(),
    invalidateByPattern: globals_1.jest.fn(),
    getOrSet: globals_1.jest.fn(),
};
globals_1.jest.mock('../../src/cache/factory.js', () => ({
    getCacheManager: () => mockCacheManager,
    _resetCacheManagerForTesting: globals_1.jest.fn(),
}));
globals_1.jest.mock('../../src/config.js', () => ({
    cfg: {
        CACHE_TTL_DEFAULT: 300,
        CACHE_ENABLED: true,
    },
}));
globals_1.jest.mock('../../src/config/logger.js', () => ({
    default: {
        info: globals_1.jest.fn(),
        error: globals_1.jest.fn(),
        warn: globals_1.jest.fn(),
        debug: globals_1.jest.fn(),
    },
}));
globals_1.jest.mock('../../src/utils/metrics.js', () => ({
    PrometheusMetrics: class {
        createCounter() { }
        incrementCounter() { }
    },
}));
// Import after mocks are set up
const CacheService_js_1 = require("../../src/services/CacheService.js");
(0, globals_1.describe)('CacheService', () => {
    let cache;
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        mockCacheManager.get.mockResolvedValue(null);
        cache = new CacheService_js_1.CacheService();
    });
    (0, globals_1.it)('returns null when key not in cache', async () => {
        mockCacheManager.get.mockResolvedValue(null);
        const result = await cache.get('test');
        (0, globals_1.expect)(result).toBeNull();
        (0, globals_1.expect)(mockCacheManager.get).toHaveBeenCalledWith('cache:test');
    });
    (0, globals_1.it)('returns value from cache manager', async () => {
        mockCacheManager.get.mockResolvedValue({ payload: true });
        const result = await cache.get('redis-key');
        (0, globals_1.expect)(result).toEqual({ payload: true });
        (0, globals_1.expect)(mockCacheManager.get).toHaveBeenCalledWith('cache:redis-key');
    });
    (0, globals_1.it)('writes to cache manager on set', async () => {
        await cache.set('write-key', { foo: 'bar' }, 45);
        (0, globals_1.expect)(mockCacheManager.set).toHaveBeenCalledWith('cache:write-key', { foo: 'bar' }, { ttl: 45 });
    });
    (0, globals_1.it)('uses default TTL when not specified', async () => {
        await cache.set('default-ttl-key', { data: 123 });
        (0, globals_1.expect)(mockCacheManager.set).toHaveBeenCalledWith('cache:default-ttl-key', { data: 123 }, { ttl: 300 });
    });
    (0, globals_1.it)('getOrSet returns cached value and skips factory', async () => {
        mockCacheManager.getOrSet.mockResolvedValue({ cached: true });
        const factory = globals_1.jest.fn();
        const result = await cache.getOrSet('hydrate', factory);
        (0, globals_1.expect)(result).toEqual({ cached: true });
        (0, globals_1.expect)(mockCacheManager.getOrSet).toHaveBeenCalledWith('cache:hydrate', factory, { ttl: 300 });
    });
    (0, globals_1.it)('getOrSet calls cache manager with custom TTL', async () => {
        mockCacheManager.getOrSet.mockResolvedValue({ fresh: true });
        const factory = globals_1.jest.fn().mockResolvedValue({ fresh: true });
        const result = await cache.getOrSet('hydrate', factory, 25);
        (0, globals_1.expect)(result).toEqual({ fresh: true });
        (0, globals_1.expect)(mockCacheManager.getOrSet).toHaveBeenCalledWith('cache:hydrate', factory, { ttl: 25 });
    });
    (0, globals_1.it)('del removes key via cache manager', async () => {
        await cache.del('temp');
        (0, globals_1.expect)(mockCacheManager.delete).toHaveBeenCalledWith('cache:temp');
    });
});
