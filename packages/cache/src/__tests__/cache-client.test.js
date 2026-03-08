"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const prom_client_1 = require("prom-client");
const index_js_1 = require("../index.js");
async function metricValue(registry, name, namespace) {
    const metrics = await registry.getMetricsAsJSON();
    const metric = metrics.find((m) => m.name === name);
    const values = metric?.values ?? [];
    return values.find((v) => v.labels?.namespace === namespace)?.value ?? 0;
}
(0, vitest_1.describe)('CacheClient', () => {
    const originalDisable = process.env.CACHE_DISABLED;
    (0, vitest_1.beforeEach)(() => {
        delete process.env.CACHE_DISABLED;
    });
    (0, vitest_1.afterEach)(() => {
        process.env.CACHE_DISABLED = originalDisable;
        vitest_1.vi.useRealTimers();
    });
    (0, vitest_1.it)('stores and retrieves values with namespacing and metrics', async () => {
        const registry = new prom_client_1.Registry();
        const client = new index_js_1.CacheClient({
            namespace: 'test-service',
            registry,
            cacheClass: 'best_effort',
            env: 'test',
        });
        (0, vitest_1.expect)(await client.get('key')).toBeNull();
        await client.set('key', 'value');
        const result = await client.get('key');
        (0, vitest_1.expect)(result).toBe('value');
        (0, vitest_1.expect)(await metricValue(registry, 'cache_hits_total', 'test-service')).toBe(1);
        (0, vitest_1.expect)(await metricValue(registry, 'cache_misses_total', 'test-service')).toBe(1);
    });
    (0, vitest_1.it)('respects TTL and records evictions for in-memory entries', async () => {
        vitest_1.vi.useFakeTimers();
        const registry = new prom_client_1.Registry();
        const client = new index_js_1.CacheClient({
            namespace: 'ttl-test',
            registry,
            cacheClass: 'critical_path',
            defaultTTLSeconds: 1,
            env: 'test',
        });
        await client.set('expiring', { value: true });
        (0, vitest_1.expect)(await client.get('expiring')).toEqual({ value: true });
        vitest_1.vi.advanceTimersByTime(1500);
        (0, vitest_1.expect)(await client.get('expiring')).toBeNull();
        (0, vitest_1.expect)(await metricValue(registry, 'cache_evictions_total', 'ttl-test')).toBe(1);
    });
    (0, vitest_1.it)('can be disabled via env switch', async () => {
        process.env.CACHE_DISABLED = 'true';
        const registry = new prom_client_1.Registry();
        const client = new index_js_1.CacheClient({
            namespace: 'disabled',
            registry,
            cacheClass: 'best_effort',
        });
        await client.set('key', 'value');
        const result = await client.get('key');
        (0, vitest_1.expect)(result).toBeNull();
        (0, vitest_1.expect)(await metricValue(registry, 'cache_misses_total', 'disabled')).toBe(1);
    });
});
