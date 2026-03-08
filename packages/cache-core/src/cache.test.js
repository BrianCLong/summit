"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const cache_js_1 = require("./cache.js");
const types_js_1 = require("./types.js");
(0, vitest_1.describe)('Cache', () => {
    let cache;
    (0, vitest_1.beforeEach)(() => {
        cache = new cache_js_1.Cache({
            namespace: 'test',
            tiers: [types_js_1.CacheTier.L1], // L1 only for unit tests
            defaultTtlSeconds: 60,
            metrics: false,
            l1: { maxBytes: 1024 * 1024 }, // 1MB
        });
    });
    (0, vitest_1.afterEach)(async () => {
        await cache.shutdown();
    });
    (0, vitest_1.describe)('get/set', () => {
        (0, vitest_1.it)('should store and retrieve a value', async () => {
            await cache.set('key1', { name: 'test' });
            const result = await cache.get('key1');
            (0, vitest_1.expect)(result).toEqual({ name: 'test' });
        });
        (0, vitest_1.it)('should return null for missing keys', async () => {
            const result = await cache.get('nonexistent');
            (0, vitest_1.expect)(result).toBeNull();
        });
        (0, vitest_1.it)('should respect TTL', async () => {
            vitest_1.vi.useFakeTimers();
            await cache.set('shortTtl', 'value', { ttlSeconds: 1 });
            // Should exist immediately
            let result = await cache.get('shortTtl');
            (0, vitest_1.expect)(result).toBe('value');
            // Advance time past TTL
            vitest_1.vi.advanceTimersByTime(2000);
            // Should be expired
            result = await cache.get('shortTtl');
            (0, vitest_1.expect)(result).toBeNull();
            vitest_1.vi.useRealTimers();
        });
        (0, vitest_1.it)('should handle different value types', async () => {
            await cache.set('string', 'hello');
            await cache.set('number', 42);
            await cache.set('boolean', true);
            await cache.set('array', [1, 2, 3]);
            await cache.set('object', { nested: { value: 'deep' } });
            (0, vitest_1.expect)(await cache.get('string')).toBe('hello');
            (0, vitest_1.expect)(await cache.get('number')).toBe(42);
            (0, vitest_1.expect)(await cache.get('boolean')).toBe(true);
            (0, vitest_1.expect)(await cache.get('array')).toEqual([1, 2, 3]);
            (0, vitest_1.expect)(await cache.get('object')).toEqual({ nested: { value: 'deep' } });
        });
    });
    (0, vitest_1.describe)('delete', () => {
        (0, vitest_1.it)('should delete a key', async () => {
            await cache.set('toDelete', 'value');
            (0, vitest_1.expect)(await cache.get('toDelete')).toBe('value');
            await cache.delete('toDelete');
            (0, vitest_1.expect)(await cache.get('toDelete')).toBeNull();
        });
        (0, vitest_1.it)('should not error when deleting nonexistent key', async () => {
            await (0, vitest_1.expect)(cache.delete('nonexistent')).resolves.not.toThrow();
        });
    });
    (0, vitest_1.describe)('deleteByPattern', () => {
        (0, vitest_1.it)('should delete keys matching pattern', async () => {
            await cache.set('user:1', 'alice');
            await cache.set('user:2', 'bob');
            await cache.set('config:1', 'value');
            const deleted = await cache.deleteByPattern('user:*');
            (0, vitest_1.expect)(deleted).toBe(2);
            (0, vitest_1.expect)(await cache.get('user:1')).toBeNull();
            (0, vitest_1.expect)(await cache.get('user:2')).toBeNull();
            (0, vitest_1.expect)(await cache.get('config:1')).toBe('value');
        });
    });
    (0, vitest_1.describe)('getOrSet', () => {
        (0, vitest_1.it)('should return cached value if exists', async () => {
            await cache.set('existing', 'cached');
            const loader = vitest_1.vi.fn().mockResolvedValue('fresh');
            const result = await cache.getOrSet('existing', loader);
            (0, vitest_1.expect)(result).toBe('cached');
            (0, vitest_1.expect)(loader).not.toHaveBeenCalled();
        });
        (0, vitest_1.it)('should call loader and cache result if not exists', async () => {
            const loader = vitest_1.vi.fn().mockResolvedValue('fresh');
            const result = await cache.getOrSet('new', loader);
            (0, vitest_1.expect)(result).toBe('fresh');
            (0, vitest_1.expect)(loader).toHaveBeenCalledTimes(1);
            // Should be cached now
            const cached = await cache.get('new');
            (0, vitest_1.expect)(cached).toBe('fresh');
        });
        (0, vitest_1.it)('should prevent stampede (deduplicate concurrent calls)', async () => {
            let callCount = 0;
            const loader = vitest_1.vi.fn().mockImplementation(async () => {
                callCount++;
                await new Promise((resolve) => setTimeout(resolve, 100));
                return `result-${callCount}`;
            });
            // Start multiple concurrent requests
            const [r1, r2, r3] = await Promise.all([
                cache.getOrSet('stampede', loader),
                cache.getOrSet('stampede', loader),
                cache.getOrSet('stampede', loader),
            ]);
            // Loader should only be called once
            (0, vitest_1.expect)(loader).toHaveBeenCalledTimes(1);
            // All should get the same result
            (0, vitest_1.expect)(r1).toBe('result-1');
            (0, vitest_1.expect)(r2).toBe('result-1');
            (0, vitest_1.expect)(r3).toBe('result-1');
        });
    });
    (0, vitest_1.describe)('tags', () => {
        (0, vitest_1.it)('should support tag-based invalidation', async () => {
            await cache.set('entity:1', { id: 1 }, { tags: ['investigation:100'] });
            await cache.set('entity:2', { id: 2 }, { tags: ['investigation:100'] });
            await cache.set('entity:3', { id: 3 }, { tags: ['investigation:200'] });
            (0, vitest_1.expect)(await cache.get('entity:1')).toEqual({ id: 1 });
            (0, vitest_1.expect)(await cache.get('entity:2')).toEqual({ id: 2 });
            (0, vitest_1.expect)(await cache.get('entity:3')).toEqual({ id: 3 });
            // Invalidate by tag
            await cache.invalidateByTag('investigation:100');
            (0, vitest_1.expect)(await cache.get('entity:1')).toBeNull();
            (0, vitest_1.expect)(await cache.get('entity:2')).toBeNull();
            (0, vitest_1.expect)(await cache.get('entity:3')).toEqual({ id: 3 }); // Still exists
        });
    });
    (0, vitest_1.describe)('stats', () => {
        vitest_1.it.skip('should track hits and misses', async () => {
            await cache.set('key', 'value');
            await cache.get('key'); // hit
            await cache.get('key'); // hit
            await cache.get('missing'); // miss
            const stats = cache.getStats();
            (0, vitest_1.expect)(stats.hitRate).toBeGreaterThan(0);
            (0, vitest_1.expect)(stats.missRate).toBeGreaterThan(0);
        });
    });
    (0, vitest_1.describe)('clear', () => {
        (0, vitest_1.it)('should clear all entries', async () => {
            await cache.set('a', 1);
            await cache.set('b', 2);
            await cache.set('c', 3);
            await cache.clear();
            (0, vitest_1.expect)(await cache.get('a')).toBeNull();
            (0, vitest_1.expect)(await cache.get('b')).toBeNull();
            (0, vitest_1.expect)(await cache.get('c')).toBeNull();
        });
    });
    (0, vitest_1.describe)('enable/disable', () => {
        (0, vitest_1.it)('should bypass cache when disabled', async () => {
            await cache.set('key', 'value');
            (0, vitest_1.expect)(await cache.get('key')).toBe('value');
            cache.disable();
            (0, vitest_1.expect)(await cache.get('key')).toBeNull();
            (0, vitest_1.expect)(cache.isEnabled()).toBe(false);
            cache.enable();
            (0, vitest_1.expect)(await cache.get('key')).toBe('value');
            (0, vitest_1.expect)(cache.isEnabled()).toBe(true);
        });
    });
});
(0, vitest_1.describe)('createCache', () => {
    (0, vitest_1.it)('should create a cache instance', () => {
        const cache = (0, cache_js_1.createCache)({
            namespace: 'test',
            tiers: [types_js_1.CacheTier.L1],
        });
        (0, vitest_1.expect)(cache).toBeDefined();
        (0, vitest_1.expect)(cache.isEnabled()).toBe(true);
    });
});
