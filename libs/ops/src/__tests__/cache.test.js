"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const cache_js_1 = require("../cache.js");
class InMemoryCache {
    store = new Map();
    async get(key) {
        return this.store.has(key) ? this.store.get(key) : null;
    }
    async setex(key, _ttl, value) {
        this.store.set(key, value);
    }
    async keys(pattern) {
        const prefix = pattern.replace('*', '');
        return [...this.store.keys()].filter((key) => key.startsWith(prefix));
    }
    async del(keys) {
        let removed = 0;
        keys.forEach((key) => {
            removed += this.store.delete(key) ? 1 : 0;
        });
        return removed;
    }
}
(0, globals_1.describe)('CacheManager', () => {
    let adapter;
    let cache;
    (0, globals_1.beforeEach)(() => {
        adapter = new InMemoryCache();
        cache = new cache_js_1.CacheManager(adapter);
    });
    (0, globals_1.it)('stores computed value when miss and returns cached on hit', async () => {
        const factory = globals_1.vi.fn().mockResolvedValue({ foo: 'bar' });
        const first = await cache.remember('demo:1', 30, factory);
        const second = await cache.remember('demo:1', 30, factory);
        (0, globals_1.expect)(first).toEqual({ foo: 'bar' });
        (0, globals_1.expect)(second).toEqual(first);
        (0, globals_1.expect)(factory).toHaveBeenCalledTimes(1);
    });
    (0, globals_1.it)('bust removes matching keys', async () => {
        await cache.remember('group:item1', 30, async () => 'a');
        await cache.remember('group:item2', 30, async () => 'b');
        await cache.bust('group');
        const miss = await cache.remember('group:item1', 30, async () => 'c');
        (0, globals_1.expect)(miss).toBe('c');
    });
    (0, globals_1.it)('throws when ttl is non-positive', async () => {
        await (0, globals_1.expect)(cache.remember('invalid', 0, async () => 'x')).rejects.toThrow('cache_ttl_must_be_positive');
    });
});
