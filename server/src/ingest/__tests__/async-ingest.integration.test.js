"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const async_pipeline_js_1 = require("../async-pipeline.js");
(0, globals_1.describe)('Async ingestion pipeline - integration', () => {
    const basePayload = {
        tenantId: 'tenant-a',
        sourceType: 'api',
        sourceId: 'source-1',
        userId: 'user-1',
        entities: [
            {
                externalId: 'person-1',
                kind: 'person',
                labels: ['Person'],
                properties: { name: 'Alice' },
            },
        ],
        relationships: [],
    };
    (0, globals_1.it)('deduplicates identical payloads and processes once', async () => {
        const repo = new async_pipeline_js_1.InMemoryAsyncIngestRepository();
        const dispatcher = new async_pipeline_js_1.AsyncIngestDispatcher(repo);
        const ingestService = { ingest: globals_1.jest.fn().mockResolvedValue({ success: true }) };
        const worker = new async_pipeline_js_1.AsyncIngestWorker(repo, ingestService, {
            batchSize: 5,
            baseBackoffMs: 10,
        });
        const first = await dispatcher.enqueue(basePayload, 'run-1');
        const second = await dispatcher.enqueue(basePayload, 'run-1');
        (0, globals_1.expect)(first.jobId).toBe(second.jobId);
        (0, globals_1.expect)(second.duplicate).toBe(true);
        await worker.processOnce();
        (0, globals_1.expect)(ingestService.ingest).toHaveBeenCalledTimes(1);
        const job = repo.jobs.get(first.jobId);
        (0, globals_1.expect)(job.status).toBe('COMPLETED');
        const processedEvents = Array.from(repo.outbox.values()).filter((evt) => evt.processedAt);
        (0, globals_1.expect)(processedEvents).toHaveLength(1);
    });
    (0, globals_1.it)('reschedules after failure and succeeds after restart', async () => {
        const repo = new async_pipeline_js_1.InMemoryAsyncIngestRepository();
        const dispatcher = new async_pipeline_js_1.AsyncIngestDispatcher(repo);
        const ingestService = {
            ingest: globals_1.jest
                .fn()
                .mockRejectedValueOnce(new Error('neo4j down'))
                .mockResolvedValueOnce({ success: true }),
        };
        const worker = new async_pipeline_js_1.AsyncIngestWorker(repo, ingestService, {
            batchSize: 2,
            baseBackoffMs: 5,
        });
        const { jobId } = await dispatcher.enqueue({ ...basePayload, sourceId: 'source-2' }, 'crashy-run');
        await worker.processOnce();
        (0, globals_1.expect)(ingestService.ingest).toHaveBeenCalledTimes(1);
        const afterFailure = repo.jobs.get(jobId);
        (0, globals_1.expect)(afterFailure.status).toBe('FAILED');
        await worker.processOnce(new Date(Date.now() + 10_000));
        (0, globals_1.expect)(ingestService.ingest).toHaveBeenCalledTimes(2);
        const completed = repo.jobs.get(jobId);
        (0, globals_1.expect)(completed.status).toBe('COMPLETED');
        const processedOutbox = Array.from(repo.outbox.values()).find((evt) => evt.jobId === jobId);
        (0, globals_1.expect)(processedOutbox?.processedAt).toBeTruthy();
    });
});
