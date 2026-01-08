
import { test } from 'node:test';
import assert from 'node:assert';
import { ProbabilisticCache } from './ProbabilisticCache.js';
import { RedisService } from './redis.js';

// Mock RedisService
const mockRedis = {
    store: new Map<string, string>(),
    async set(key: string, value: string, ttl: number) {
        this.store.set(key, value);
    },
    async get(key: string) {
        return this.store.get(key) || null;
    },
    async del(key: string) {
        this.store.delete(key);
    },
    getClient() { return {}; }
};

// Patch singleton
(RedisService as any).getInstance = () => mockRedis;

test('ProbabilisticCache', async (t) => {

    await t.test('respects enabled flag', async () => {
        const cache = new ProbabilisticCache({ enabled: false });
        await cache.markMissing('user:123');
        const isMissing = await cache.isKnownMissing('user:123');
        assert.strictEqual(isMissing, false);
    });

    await t.test('prevents cache penetration when enabled', async () => {
        const cache = new ProbabilisticCache({ enabled: true });

        // Initial check - should go through
        assert.strictEqual(await cache.isKnownMissing('user:999'), false);

        // Mark as missing
        await cache.markMissing('user:999');

        // Subsequent check - should be blocked
        assert.strictEqual(await cache.isKnownMissing('user:999'), true);

        // Different key - should go through
        assert.strictEqual(await cache.isKnownMissing('user:888'), false);
    });

    await t.test('clears missing status', async () => {
         const cache = new ProbabilisticCache({ enabled: true });
         await cache.markMissing('user:777');
         assert.strictEqual(await cache.isKnownMissing('user:777'), true);

         await cache.clearMissing('user:777');
         assert.strictEqual(await cache.isKnownMissing('user:777'), false);
    });
});
