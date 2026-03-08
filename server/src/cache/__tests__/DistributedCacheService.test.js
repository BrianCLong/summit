"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const DistributedCacheService_js_1 = require("../DistributedCacheService.js");
// Mock Redis
const mockRedis = {
    get: globals_1.jest.fn(),
    set: globals_1.jest.fn(),
    setex: globals_1.jest.fn(),
    del: globals_1.jest.fn(),
    duplicate: globals_1.jest.fn(() => ({
        subscribe: globals_1.jest.fn(),
        on: globals_1.jest.fn(),
        quit: globals_1.jest.fn(),
        unsubscribe: globals_1.jest.fn(),
    })),
    pipeline: globals_1.jest.fn(() => ({
        setex: globals_1.jest.fn(),
        exec: globals_1.jest.fn(),
    })),
    publish: globals_1.jest.fn(),
};
(0, globals_1.describe)('DistributedCacheService', () => {
    let cache;
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        cache = new DistributedCacheService_js_1.DistributedCacheService(mockRedis, {
            defaultTTLSeconds: 60,
            enableInvalidation: false
        });
    });
    (0, globals_1.afterEach)(async () => {
        await cache.shutdown();
    });
    (0, globals_1.describe)('get', () => {
        (0, globals_1.it)('should return L1 cache hit if available', async () => {
            // Seed L1
            await cache.set('foo', 'bar');
            mockRedis.get.mockClear(); // Clear any calls from set()
            const result = await cache.get('foo');
            (0, globals_1.expect)(result.data).toBe('bar');
            (0, globals_1.expect)(result.provenance.source).toContain('L1');
            (0, globals_1.expect)(mockRedis.get).not.toHaveBeenCalled();
        });
        (0, globals_1.it)('should fetch from L2 if L1 miss', async () => {
            const entry = {
                value: 'baz',
                createdAt: Date.now(),
                expiresAt: Date.now() + 10000,
                tags: [],
                compressed: false
            };
            mockRedis.get.mockResolvedValue(JSON.stringify(entry));
            const result = await cache.get('foo');
            (0, globals_1.expect)(result.data).toBe('baz');
            (0, globals_1.expect)(result.provenance.source).toContain('L2');
            (0, globals_1.expect)(mockRedis.get).toHaveBeenCalled();
        });
        (0, globals_1.it)('should return null if miss in both', async () => {
            mockRedis.get.mockResolvedValue(null);
            const result = await cache.get('missing');
            (0, globals_1.expect)(result.data).toBeNull();
        });
    });
    (0, globals_1.describe)('set', () => {
        (0, globals_1.it)('should set value in L1 and L2', async () => {
            const result = await cache.set('key', 'value');
            (0, globals_1.expect)(result.data).toBe(true);
            (0, globals_1.expect)(mockRedis.setex).toHaveBeenCalled();
            // Verify L1
            const l1Result = await cache.get('key');
            (0, globals_1.expect)(l1Result.provenance.source).toContain('L1');
        });
    });
});
