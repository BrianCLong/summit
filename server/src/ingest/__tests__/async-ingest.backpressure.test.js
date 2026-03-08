"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const async_pipeline_js_1 = require("../async-pipeline.js");
(0, globals_1.describe)('Async ingestion backpressure and backoff', () => {
    const payload = {
        tenantId: 'tenant-cap',
        sourceType: 'api',
        sourceId: 'src-cap',
        userId: 'user-cap',
        entities: [
            {
                externalId: 'entity-1',
                kind: 'indicator',
                labels: ['Indicator'],
                properties: { value: 'abc' },
            },
        ],
        relationships: [],
    };
    (0, globals_1.it)('calculates exponential backoff with cap', () => {
        (0, globals_1.expect)((0, async_pipeline_js_1.calculateBackoffDelay)(1, 100, 1000)).toBe(100);
        (0, globals_1.expect)((0, async_pipeline_js_1.calculateBackoffDelay)(2, 100, 1000)).toBe(200);
        (0, globals_1.expect)((0, async_pipeline_js_1.calculateBackoffDelay)(4, 100, 1000)).toBe(800);
        (0, globals_1.expect)((0, async_pipeline_js_1.calculateBackoffDelay)(6, 100, 500)).toBe(500);
    });
    (0, globals_1.it)('applies per-tenant concurrency cap and reschedules work', async () => {
        const repo = new async_pipeline_js_1.InMemoryAsyncIngestRepository();
        const dispatcher = new async_pipeline_js_1.AsyncIngestDispatcher(repo);
        const ingestService = { ingest: globals_1.jest.fn().mockResolvedValue({ success: true }) };
        const worker = new async_pipeline_js_1.AsyncIngestWorker(repo, ingestService, {
            maxTenantConcurrency: 1,
            baseBackoffMs: 50,
            batchSize: 10,
        });
        const first = await dispatcher.enqueue(payload, 'cap-1');
        const second = await dispatcher.enqueue({ ...payload, sourceId: 'src-cap-2' }, 'cap-2');
        const firstJob = repo.jobs.get(first.jobId);
        repo.jobs.set(firstJob.id, { ...firstJob, status: 'PROCESSING' });
        await worker.processOnce();
        (0, globals_1.expect)(ingestService.ingest).not.toHaveBeenCalled();
        const blocked = Array.from(repo.outbox.values()).find((evt) => evt.jobId === second.jobId);
        (0, globals_1.expect)(blocked.nextAttemptAt.getTime()).toBeGreaterThan(Date.now());
        (0, globals_1.expect)(blocked.processedAt).toBeFalsy();
    });
});
