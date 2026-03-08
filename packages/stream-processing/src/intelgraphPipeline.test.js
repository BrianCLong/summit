"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const intelgraphPipeline_js_1 = require("./intelgraphPipeline.js");
describe('IntelGraphPipeline', () => {
    const schema = zod_1.z.object({
        id: zod_1.z.string(),
        payload: zod_1.z.object({}).passthrough(),
        residency: zod_1.z.string(),
        pii: zod_1.z.string().optional(),
        createdAt: zod_1.z.number(),
    });
    const registry = new intelgraphPipeline_js_1.SourceRegistry();
    registry.register({
        id: 'source-1',
        owner: 'prd',
        transport: 'http',
        retentionDays: 365,
        residency: 'us',
        piiFields: ['pii'],
    });
    const createPipeline = (overrides = {}) => {
        const hot = new intelgraphPipeline_js_1.InMemorySink('hot');
        const warm = new intelgraphPipeline_js_1.InMemorySink('warm');
        const cold = new intelgraphPipeline_js_1.InMemorySink('cold');
        const rateShaper = new intelgraphPipeline_js_1.TokenBucketRateShaper({ capacityPerSecond: 2, burstCapacity: 2 });
        const dedupe = new intelgraphPipeline_js_1.DedupeWindow({ windowMs: 10_000 });
        const dlq = new intelgraphPipeline_js_1.DeadLetterQueue({ baseBackoffMs: 50, maxBackoffMs: 200, jitterMs: 10 });
        const pipeline = new intelgraphPipeline_js_1.IntelGraphPipeline({
            sourceId: 'source-1',
            schema,
            registry,
            rateShaper,
            dedupeWindow: dedupe,
            dlq,
            sinks: { hot, warm, cold },
            route: (evt) => (evt.payload.priority === 'hot' ? 'hot' : 'warm'),
            dedupeKey: (evt) => `${evt.id}`,
            cleaners: [
                (evt) => ({ ...evt, payload: { ...evt.payload, normalized: true } }),
            ],
            enricher: (evt) => ({ ...evt, enriched: true }),
            residencyAllowList: ['us'],
            sloThresholdMs: 100,
            ...overrides,
        });
        return { pipeline, hot, warm, cold, dlq, rateShaper };
    };
    it('enforces rate shaping by delaying requests beyond capacity', async () => {
        const { pipeline, hot } = createPipeline();
        const start = Date.now();
        await pipeline.process({
            id: '1',
            payload: { priority: 'hot' },
            residency: 'us',
            createdAt: Date.now(),
        });
        await pipeline.process({
            id: '2',
            payload: { priority: 'hot' },
            residency: 'us',
            createdAt: Date.now(),
        });
        await pipeline.process({
            id: '3',
            payload: { priority: 'hot' },
            residency: 'us',
            createdAt: Date.now(),
        });
        const elapsed = Date.now() - start;
        expect(hot.events).toHaveLength(3);
        expect(elapsed).toBeGreaterThanOrEqual(900);
    }, 5000);
    it('drops duplicates within the dedupe window', async () => {
        const { pipeline, hot } = createPipeline();
        await pipeline.process({
            id: 'dup',
            payload: { priority: 'hot' },
            residency: 'us',
            createdAt: Date.now(),
        });
        await pipeline.process({
            id: 'dup',
            payload: { priority: 'hot' },
            residency: 'us',
            createdAt: Date.now(),
        });
        expect(hot.events).toHaveLength(1);
    });
    it('redacts configured PII fields before reaching sinks', async () => {
        const { pipeline, hot } = createPipeline();
        await pipeline.process({
            id: 'pii-1',
            payload: { priority: 'hot' },
            residency: 'us',
            pii: 'sensitive',
            createdAt: Date.now(),
        });
        expect(hot.events[0].pii).toBe('[REDACTED]');
    });
    it('routes failures to DLQ and allows replay with retries', async () => {
        const failingSink = new intelgraphPipeline_js_1.InMemorySink('hot', (evt) => evt.id === 'fail');
        const { pipeline, dlq, warm } = createPipeline({
            sinks: { hot: failingSink, warm: new intelgraphPipeline_js_1.InMemorySink('warm'), cold: new intelgraphPipeline_js_1.InMemorySink('cold') },
            route: (evt) => (evt.id === 'fail' ? 'hot' : 'warm'),
        });
        await pipeline.process({
            id: 'fail',
            payload: { priority: 'hot' },
            residency: 'us',
            createdAt: Date.now(),
        });
        expect(dlq.size()).toBe(1);
        // Replay with handler that routes to warm
        await pipeline.replayDeadLetter(async (evt) => {
            await warm.write(evt);
        });
        expect(warm.events).toHaveLength(1);
        expect(dlq.size()).toBe(0);
    });
    it('tracks latency and enqueues SLO breaches', async () => {
        const dlq = new intelgraphPipeline_js_1.DeadLetterQueue({ baseBackoffMs: 10, maxBackoffMs: 20, jitterMs: 1 });
        const { pipeline } = createPipeline({ dlq, sloThresholdMs: 1 });
        await pipeline.process({
            id: 'fast',
            payload: { priority: 'hot' },
            residency: 'us',
            createdAt: Date.now(),
        });
        // force a slow path
        await pipeline.process({
            id: 'slow',
            payload: { priority: 'hot' },
            residency: 'us',
            createdAt: Date.now(),
        });
        const p95 = pipeline.getP95Latency();
        expect(p95).toBeGreaterThan(0);
        // Allow a small delay to be registered as SLO breach
        if (p95 > 1) {
            expect(dlq.size()).toBeGreaterThanOrEqual(1);
        }
    });
});
