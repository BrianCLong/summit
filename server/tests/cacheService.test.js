"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
// Mock config before importing CacheService
globals_1.jest.mock('../src/config.js', () => ({
    cfg: {
        CACHE_TTL_DEFAULT: 300,
        CACHE_ENABLED: true,
    },
}));
// Mock dependencies
globals_1.jest.mock('../src/config/logger.js', () => ({
    __esModule: true,
    default: {
        info: globals_1.jest.fn(),
        error: globals_1.jest.fn(),
        warn: globals_1.jest.fn(),
        debug: globals_1.jest.fn(),
    },
}));
globals_1.jest.mock('../src/utils/metrics.js', () => ({
    PrometheusMetrics: class {
        createCounter() { }
        incrementCounter() { }
    }
}));
// We need to mock getRedisClient called by factory
globals_1.jest.mock('../src/config/database.js', () => ({
    getRedisClient: globals_1.jest.fn(() => ({
        get: globals_1.jest.fn(),
        set: globals_1.jest.fn(),
        del: globals_1.jest.fn(),
        on: globals_1.jest.fn(),
        pipeline: globals_1.jest.fn(() => ({
            setex: globals_1.jest.fn(),
            del: globals_1.jest.fn(),
            exec: globals_1.jest.fn(),
        })),
    })),
}));
// Mock AdvancedCachingStrategy
globals_1.jest.mock('../src/cache/AdvancedCachingStrategy.js', () => {
    const MockCacheManager = class {
        storage = new Map();
        constructor() { }
        async get(key) {
            return this.storage.get(key) || null;
        }
        async set(key, value, _options) {
            this.storage.set(key, value);
        }
        async delete(key) {
            this.storage.delete(key);
        }
        async invalidateByPattern(pattern) {
            const p = pattern.replace('*', '');
            for (const key of this.storage.keys()) {
                if (key.includes(p)) {
                    this.storage.delete(key);
                }
            }
        }
        async getOrSet(key, factory, _options) {
            if (this.storage.has(key))
                return this.storage.get(key);
            const val = await factory();
            this.storage.set(key, val);
            return val;
        }
    };
    return {
        __esModule: true,
        default: MockCacheManager,
        CacheManager: MockCacheManager,
    };
});
// Import after mocks
const CacheService_js_1 = require("../src/services/CacheService.js");
const factory_js_1 = require("../src/cache/factory.js");
(0, globals_1.describe)('CacheService', () => {
    let cache;
    (0, globals_1.beforeEach)(() => {
        (0, factory_js_1._resetCacheManagerForTesting)();
        cache = new CacheService_js_1.CacheService();
    });
    (0, globals_1.afterEach)(() => {
        globals_1.jest.clearAllMocks();
    });
    (0, globals_1.it)('returns null on miss', async () => {
        const v = await cache.get('missing');
        (0, globals_1.expect)(v).toBeNull();
    });
    (0, globals_1.it)('sets and gets a value', async () => {
        await cache.set('k1', { a: 1 }, 1);
        const v = await cache.get('k1');
        (0, globals_1.expect)(v).toEqual({ a: 1 });
    });
    (0, globals_1.it)('delete clears a key', async () => {
        await cache.set('k3', 'y', 5);
        await cache.del('k3');
        const v = await cache.get('k3');
        (0, globals_1.expect)(v).toBeNull();
    });
    (0, globals_1.it)('getOrSet returns value', async () => {
        const val = await cache.getOrSet('k4', async () => 'computed');
        (0, globals_1.expect)(val).toBe('computed');
        const val2 = await cache.get('k4');
        (0, globals_1.expect)(val2).toBe('computed');
    });
});
