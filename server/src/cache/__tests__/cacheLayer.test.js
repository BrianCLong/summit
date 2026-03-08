"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const responseCache_js_1 = require("../responseCache.js");
const invalidation_js_1 = require("../invalidation.js");
const warmers_js_1 = require("../warmers.js");
(0, globals_1.describe)('advanced cache layer', () => {
    (0, globals_1.beforeEach)(() => {
        process.env.REDIS_DISABLE = '1';
        (0, responseCache_js_1.flushLocalCache)();
        (0, warmers_js_1.resetWarmersForTesting)();
    });
    (0, globals_1.it)('caches values, supports query caching, and invalidates by prefix', async () => {
        let calls = 0;
        const fetcher = async () => {
            calls += 1;
            return { value: calls };
        };
        const keyParts = ['counts', 'tenantA'];
        const first = await (0, responseCache_js_1.cached)(keyParts, { ttlSec: 60, tags: ['counts'], op: 'test', swrSec: 10 }, fetcher);
        const second = await (0, responseCache_js_1.cached)(keyParts, { ttlSec: 60, tags: ['counts'], op: 'test', swrSec: 10 }, fetcher);
        (0, globals_1.expect)(first).toEqual(second);
        (0, globals_1.expect)(calls).toBe(1);
        const queryResult = await (0, responseCache_js_1.cacheQueryResult)('select 1', { id: 1 }, async () => 'ok', { tenant: 'tenantA', ttlSec: 30 });
        (0, globals_1.expect)(queryResult).toBe('ok');
        await (0, invalidation_js_1.emitInvalidation)(['counts:*']);
        const third = await (0, responseCache_js_1.cached)(keyParts, { ttlSec: 60, tags: ['counts'], op: 'test', swrSec: 10 }, fetcher);
        (0, globals_1.expect)(third.value).toBe(2);
        (0, globals_1.expect)((0, responseCache_js_1.getLocalCacheStats)().size).toBeGreaterThan(0);
    });
    (0, globals_1.it)('runs warmers and records results', async () => {
        let warmed = 0;
        (0, warmers_js_1.registerCacheWarmer)({
            name: 'test-warmer',
            keyParts: ['test', 'anon'],
            ttlSec: 10,
            tags: ['test'],
            fetcher: async () => {
                warmed += 1;
                return { warmed };
            },
        });
        const results = await (0, warmers_js_1.runWarmers)('manual');
        const stats = (0, warmers_js_1.getWarmerStats)();
        (0, globals_1.expect)(results[0]?.ok).toBe(true);
        (0, globals_1.expect)(stats.lastResults.length).toBe(1);
        (0, globals_1.expect)(warmed).toBe(1);
    });
});
