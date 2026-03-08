"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const index_js_1 = require("../src/index.js");
const makeSample = (overrides = {}) => ({
    journey: 'case_search_load',
    step: 'search_api',
    p95: 420,
    errorRate: 0.005,
    sampleRate: 0.2,
    cacheHit: true,
    payloadBytes: 42_000,
    ...overrides,
});
(0, vitest_1.describe)('PerformanceBudgetGate', () => {
    (0, vitest_1.it)('passes telemetry that respects p95 targets and payload budgets', () => {
        const gate = new index_js_1.PerformanceBudgetGate();
        const result = gate.evaluate(makeSample());
        (0, vitest_1.expect)(result.status).toBe('pass');
        (0, vitest_1.expect)(result.targetMs).toBe(index_js_1.DEFAULT_JOURNEY_TARGETS[0].steps.search_api);
    });
    (0, vitest_1.it)('flags breaches when latency or payloads exceed budgets', () => {
        const gate = new index_js_1.PerformanceBudgetGate();
        const result = gate.evaluate(makeSample({ p95: 920, payloadBytes: 200_000, cacheHit: false }));
        (0, vitest_1.expect)(result.status).toBe('breach');
        (0, vitest_1.expect)(result.reason).toContain('p95');
    });
    (0, vitest_1.it)('warns when journey step targets are missing', () => {
        const gate = new index_js_1.PerformanceBudgetGate();
        const result = gate.evaluate(makeSample({ journey: 'unknown', step: 'mystery', p95: 1 }));
        (0, vitest_1.expect)(result.status).toBe('warn');
    });
});
(0, vitest_1.describe)('TopOffenderBoard', () => {
    (0, vitest_1.it)('tracks offenders sorted by severity across categories', () => {
        const board = new index_js_1.TopOffenderBoard();
        board.record({ id: 'endpoint-a', kind: 'endpoint', p95Ms: 950, errorRate: 0.12, volume: 130 });
        board.record({ id: 'endpoint-b', kind: 'endpoint', p95Ms: 700, errorRate: 0.01, volume: 30 });
        const snapshot = board.snapshot();
        (0, vitest_1.expect)(snapshot.slowestEndpoints[0].id).toBe('endpoint-a');
    });
});
(0, vitest_1.describe)('CacheManager', () => {
    (0, vitest_1.it)('returns cached entries and applies jitter with negative caching', async () => {
        const cache = new index_js_1.CacheManager({ jitterPct: 0 });
        const first = await cache.getOrLoad('profile', 'tenant-a', async () => ({
            value: 'hit-1',
        }));
        const second = await cache.getOrLoad('profile', 'tenant-a', async () => ({
            value: 'hit-2',
        }));
        (0, vitest_1.expect)(first.value).toBe('hit-1');
        (0, vitest_1.expect)(second.value).toBe('hit-1');
        const negative = await cache.getOrLoad('missing', 'tenant-a', async () => ({
            value: 'missing',
            negative: true,
        }));
        (0, vitest_1.expect)(negative.negative).toBe(true);
    });
});
(0, vitest_1.describe)('ResponseShaper', () => {
    (0, vitest_1.it)('enforces projection and pagination with compression', () => {
        const shaper = new index_js_1.ResponseShaper();
        const payload = { data: Array.from({ length: 50 }, (_, idx) => ({ id: idx, name: `row-${idx}` })), meta: 'ignored' };
        const shaped = shaper.shape(payload, {
            allowedFields: ['data'],
            pageSizeLimit: 25,
            tenantTier: 'standard',
            compressionThresholdBytes: 128,
            version: '1.0',
            limit: 10,
        });
        (0, vitest_1.expect)(shaped.data && Array.isArray(shaped.data.data) && shaped.data.data).toHaveLength(10);
        (0, vitest_1.expect)(shaped.checksum).toBeDefined();
        (0, vitest_1.expect)(shaped.encoding).toBe('brotli');
    });
});
(0, vitest_1.describe)('AsyncJobManager', () => {
    (0, vitest_1.it)('deduplicates idempotent jobs and enforces concurrency per tenant', async () => {
        const manager = new index_js_1.AsyncJobManager({ perTenantConcurrency: 1 });
        const handler = vitest_1.vi.fn(async () => 'ok');
        const [first, second] = await Promise.all([
            manager.enqueue({ idempotencyKey: 'job-1', tenantId: 'tenant-a', classification: 'io', handler }),
            manager.enqueue({ idempotencyKey: 'job-1', tenantId: 'tenant-a', classification: 'io', handler }),
        ]);
        (0, vitest_1.expect)(first.result).toBe('ok');
        (0, vitest_1.expect)(second.id).toBe('job-1');
        (0, vitest_1.expect)(handler).toHaveBeenCalledTimes(1);
    });
});
(0, vitest_1.describe)('TelemetryCostController', () => {
    (0, vitest_1.it)('blocks high-cardinality or budget-exceeding telemetry', () => {
        const controller = new index_js_1.TelemetryCostController({ cardinalityLimit: 2, tracesPerMinute: 1 });
        controller.ingest({ kind: 'traces', labels: { tenant: 'a', journey: 'x' } });
        const throttled = controller.ingest({ kind: 'traces', labels: { tenant: 'a', journey: 'y' } });
        (0, vitest_1.expect)(throttled.action).toBe('throttle');
        const rejected = controller.ingest({ kind: 'traces', labels: { tenant: 'b', journey: 'z' } });
        (0, vitest_1.expect)(rejected.action).toBe('reject');
    });
});
(0, vitest_1.describe)('ReleaseMarkerEmitter', () => {
    (0, vitest_1.it)('creates release markers annotated with owner and commit', () => {
        const emitter = new index_js_1.ReleaseMarkerEmitter();
        const marker = emitter.emit('ops', 'v1.2.3', 'abc123');
        (0, vitest_1.expect)(marker.annotations.release).toBe('v1.2.3');
        (0, vitest_1.expect)(marker.owner).toBe('ops');
    });
});
(0, vitest_1.describe)('PerformanceCostOperatingSystem', () => {
    (0, vitest_1.it)('wires budget evaluation and offender tracking', () => {
        const os = new index_js_1.PerformanceCostOperatingSystem();
        const evaluation = os.evaluateJourney(makeSample());
        (0, vitest_1.expect)(evaluation.status).toBe('pass');
        const board = os.trackOffender({
            id: 'query-1',
            kind: 'query',
            p95Ms: 1600,
            errorRate: 0.02,
            volume: 40,
        });
        (0, vitest_1.expect)(board.slowestQueries).toHaveLength(1);
    });
});
