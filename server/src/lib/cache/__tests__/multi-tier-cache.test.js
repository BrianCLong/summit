"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const multi_tier_cache_js_1 = require("../multi-tier-cache.js");
class InMemoryRedis {
    state;
    messageHandler;
    constructor(state) {
        this.state =
            state ?? {
                kv: new Map(),
                sets: new Map(),
                subscribers: new Map(),
            };
    }
    duplicate() {
        return new InMemoryRedis(this.state);
    }
    now() {
        return Date.now();
    }
    cleanupKey(key) {
        const entry = this.state.kv.get(key);
        if (entry && entry.expiresAt && entry.expiresAt <= this.now()) {
            this.state.kv.delete(key);
        }
    }
    cleanupSet(key) {
        const entry = this.state.sets.get(key);
        if (entry && entry.expiresAt && entry.expiresAt <= this.now()) {
            this.state.sets.delete(key);
        }
    }
    async get(key) {
        this.cleanupKey(key);
        const entry = this.state.kv.get(key);
        return entry ? entry.value : null;
    }
    async setex(key, ttl, value) {
        this.state.kv.set(key, { value, expiresAt: this.now() + ttl * 1000 });
        return 'OK';
    }
    async del(...keys) {
        let count = 0;
        keys.forEach((key) => {
            if (this.state.kv.delete(key))
                count++;
            if (this.state.sets.delete(key))
                count++;
        });
        return count;
    }
    async sadd(key, ...members) {
        this.cleanupSet(key);
        const set = this.state.sets.get(key) ?? {
            members: new Set(),
            expiresAt: undefined,
        };
        let added = 0;
        members.forEach((member) => {
            if (!set.members.has(member)) {
                added++;
                set.members.add(member);
            }
        });
        this.state.sets.set(key, set);
        return added;
    }
    async smembers(key) {
        this.cleanupSet(key);
        return Array.from(this.state.sets.get(key)?.members ?? []);
    }
    async srem(key, member) {
        this.cleanupSet(key);
        const set = this.state.sets.get(key);
        if (!set)
            return 0;
        const existed = set.members.delete(member);
        if (set.members.size === 0) {
            this.state.sets.delete(key);
        }
        return existed ? 1 : 0;
    }
    async expire(key, seconds) {
        const expiresAt = this.now() + seconds * 1000;
        const kv = this.state.kv.get(key);
        if (kv) {
            kv.expiresAt = expiresAt;
            return 1;
        }
        const set = this.state.sets.get(key);
        if (set) {
            set.expiresAt = expiresAt;
            return 1;
        }
        return 0;
    }
    async publish(channel, message) {
        const handlers = this.state.subscribers.get(channel);
        if (!handlers)
            return 0;
        handlers.forEach((handler) => handler(channel, message));
        return handlers.size;
    }
    on(event, handler) {
        if (event === 'message') {
            this.messageHandler = handler;
        }
        return this;
    }
    async subscribe(channel) {
        const handlers = this.state.subscribers.get(channel) ?? new Set();
        if (this.messageHandler) {
            handlers.add(this.messageHandler);
        }
        this.state.subscribers.set(channel, handlers);
        return handlers.size;
    }
}
const createCache = () => {
    const redis = new InMemoryRedis();
    const cache = new multi_tier_cache_js_1.MultiTierCache({
        cacheEnabled: true,
        redisClient: redis,
        subscriberClient: redis.duplicate(),
        defaultTtlSeconds: 5,
        l1FallbackTtlSeconds: 5,
        namespace: 'cache',
        l1MaxBytes: 5 * 1024 * 1024,
    });
    return { cache, redis };
};
(0, globals_1.describe)('MultiTierCache', () => {
    (0, globals_1.afterEach)(async () => {
        globals_1.jest.useRealTimers();
    });
    (0, globals_1.it)('stores and retrieves values across tiers with ttl enforcement', async () => {
        globals_1.jest.useFakeTimers();
        const { cache, redis } = createCache();
        const now = Date.now();
        globals_1.jest.setSystemTime(now);
        await cache.set('user:1', { id: '1' }, { ttlSeconds: 1, tags: ['users'] });
        await (0, globals_1.expect)(cache.get('user:1')).resolves.toEqual({ id: '1' });
        globals_1.jest.setSystemTime(now + 1500);
        await (0, globals_1.expect)(cache.get('user:1')).resolves.toBeNull();
        (0, globals_1.expect)(await redis.get('cache:user:1')).toBeNull();
    });
    (0, globals_1.it)('deduplicates concurrent loaders via wrap and caches result', async () => {
        const { cache } = createCache();
        const loader = globals_1.jest.fn(async () => ({ value: Math.random() }));
        const [first, second] = await Promise.all([
            cache.wrap('heavy', loader, { ttlSeconds: 2 }),
            cache.wrap('heavy', loader, { ttlSeconds: 2 }),
        ]);
        (0, globals_1.expect)(loader).toHaveBeenCalledTimes(1);
        (0, globals_1.expect)(first).toEqual(second);
        await (0, globals_1.expect)(cache.get('heavy')).resolves.toEqual(first);
    });
    (0, globals_1.it)('invalidates individual keys and clears tag indexes', async () => {
        const { cache, redis } = createCache();
        await cache.set('entity:1', { id: 'entity:1' }, { ttlSeconds: 5, tags: ['entities'] });
        await (0, globals_1.expect)(cache.get('entity:1')).resolves.toEqual({ id: 'entity:1' });
        await cache.invalidate('entity:1');
        await (0, globals_1.expect)(cache.get('entity:1')).resolves.toBeNull();
        (0, globals_1.expect)(await redis.smembers('cache:tag:entities')).toHaveLength(0);
    });
    (0, globals_1.it)('invalidates by tag and evicts related cache entries', async () => {
        const { cache } = createCache();
        await cache.set('e:1', { id: '1' }, { ttlSeconds: 5, tags: ['list'] });
        await cache.set('e:2', { id: '2' }, { ttlSeconds: 5, tags: ['list'] });
        await cache.invalidateByTag('list');
        await (0, globals_1.expect)(cache.get('e:1')).resolves.toBeNull();
        await (0, globals_1.expect)(cache.get('e:2')).resolves.toBeNull();
    });
    (0, globals_1.it)('broadcasts invalidations to peer instances', async () => {
        const sharedRedis = new InMemoryRedis();
        const cacheA = new multi_tier_cache_js_1.MultiTierCache({
            cacheEnabled: true,
            redisClient: sharedRedis,
            subscriberClient: sharedRedis.duplicate(),
            defaultTtlSeconds: 5,
            namespace: 'cache',
        });
        const cacheB = new multi_tier_cache_js_1.MultiTierCache({
            cacheEnabled: true,
            redisClient: sharedRedis,
            subscriberClient: sharedRedis.duplicate(),
            defaultTtlSeconds: 5,
            namespace: 'cache',
        });
        await cacheA.set('user:peer', { id: 'peer' }, { ttlSeconds: 5 });
        await cacheB.get('user:peer');
        await cacheA.invalidate('user:peer');
        await new Promise((resolve) => setTimeout(resolve, 0));
        await (0, globals_1.expect)(cacheB.get('user:peer')).resolves.toBeNull();
    });
});
