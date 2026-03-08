"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const BatchProcessor_js_1 = require("../../src/batch/BatchProcessor.js");
const addMock = globals_1.jest.fn();
const closeMock = globals_1.jest.fn();
const updateProgressMock = globals_1.jest.fn();
const publishMock = globals_1.jest.fn();
const executeMock = globals_1.jest.fn();
const queryOneMock = globals_1.jest.fn();
const mockClient = { query: globals_1.jest.fn() };
const transactionMock = globals_1.jest.fn(async (fn) => fn(mockClient));
const resolveNowMock = globals_1.jest.fn();
class MockQueue {
    name;
    constructor(name) {
        this.name = name;
    }
    add = addMock;
    close = closeMock;
}
class MockWorker {
    queueName;
    processor;
    handlers = {};
    constructor(queueName, processor) {
        this.queueName = queueName;
        this.processor = processor;
    }
    on(event, handler) {
        this.handlers[event] = [...(this.handlers[event] ?? []), handler];
    }
    async close() {
        // noop for tests
    }
}
globals_1.jest.mock('bullmq', () => ({
    __esModule: true,
    Queue: MockQueue,
    Worker: MockWorker,
    Job: class {
    },
}));
globals_1.jest.mock('../../src/events/EventBus.js', () => ({
    __esModule: true,
    getEventBus: () => ({ publish: publishMock }),
}));
globals_1.jest.mock('../../src/db/connection.js', () => ({
    __esModule: true,
    getDatabase: () => ({
        execute: executeMock,
        queryOne: queryOneMock,
        transaction: transactionMock,
    }),
}));
globals_1.jest.mock('../../src/core/ResolutionService.js', () => ({
    __esModule: true,
    ResolutionService: globals_1.jest.fn().mockImplementation(() => ({ resolveNow: resolveNowMock })),
}));
(0, globals_1.describe)('BatchProcessor', () => {
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        addMock.mockResolvedValue(undefined);
        closeMock.mockResolvedValue(undefined);
        updateProgressMock.mockResolvedValue(undefined);
        publishMock.mockResolvedValue(undefined);
        executeMock.mockResolvedValue(1);
        queryOneMock.mockResolvedValue(null);
        mockClient.query.mockResolvedValue({ rowCount: 1 });
        resolveNowMock.mockImplementation(async ({ recordRef }) => ({
            candidates: [
                {
                    decision: 'AUTO_NO_MATCH',
                    score: 0.5,
                    nodeId: recordRef.recordId,
                },
            ],
            matchedNodeId: null,
            clusterId: null,
        }));
    });
    (0, globals_1.it)('completes an empty batch without errors and persists completion', async () => {
        const processor = new BatchProcessor_js_1.BatchProcessor({ progressUpdateInterval: 1 });
        const records = [];
        const job = await processor.submitBatch({
            tenantId: 'tenant-1',
            entityType: 'Person',
            datasetRef: 'dataset-empty',
            records,
            createdBy: 'tester',
        });
        await processor.processJob({
            data: { jobId: job.jobId, records },
            updateProgress: updateProgressMock,
        });
        (0, globals_1.expect)(job.status).toBe('COMPLETED');
        (0, globals_1.expect)(job.processedRecords).toBe(0);
        (0, globals_1.expect)(job.completedAt).toBeDefined();
        (0, globals_1.expect)(publishMock).toHaveBeenCalledWith(globals_1.expect.objectContaining({
            eventType: 'BATCH_COMPLETED',
            payload: globals_1.expect.objectContaining({ processedRecords: 0 }),
        }));
    });
    (0, globals_1.it)('honors cancellation mid-batch without marking the job completed', async () => {
        const processor = new BatchProcessor_js_1.BatchProcessor({ progressUpdateInterval: 1 });
        const records = [
            { recordId: 'r1', attributes: { firstName: 'A' } },
            { recordId: 'r2', attributes: { firstName: 'B' } },
            { recordId: 'r3', attributes: { firstName: 'C' } },
        ];
        const job = await processor.submitBatch({
            tenantId: 'tenant-1',
            entityType: 'Person',
            datasetRef: 'dataset-partial',
            records,
            createdBy: 'tester',
        });
        let callCount = 0;
        resolveNowMock.mockImplementation(async ({ recordRef }) => {
            callCount++;
            if (callCount === 1) {
                const inMemoryJob = processor.jobStore.get(job.jobId);
                if (inMemoryJob) {
                    inMemoryJob.status = 'CANCELLED';
                }
            }
            return {
                candidates: [
                    { decision: 'AUTO_MERGE', score: 0.9, nodeId: recordRef.recordId },
                ],
                matchedNodeId: 'node-' + recordRef.recordId,
                clusterId: 'cluster-' + recordRef.recordId,
            };
        });
        await processor.processJob({
            data: { jobId: job.jobId, records },
            updateProgress: updateProgressMock,
        });
        (0, globals_1.expect)(job.status).toBe('CANCELLED');
        (0, globals_1.expect)(job.processedRecords).toBe(1);
        (0, globals_1.expect)(job.completedAt).toBeDefined();
        (0, globals_1.expect)(publishMock).not.toHaveBeenCalledWith(globals_1.expect.objectContaining({ eventType: 'BATCH_COMPLETED' }));
        (0, globals_1.expect)(transactionMock).toHaveBeenCalledTimes(1);
    });
    (0, globals_1.it)('processes multiple jobs concurrently without sharing progress counters', async () => {
        const processor = new BatchProcessor_js_1.BatchProcessor({ progressUpdateInterval: 1 });
        const recordsA = [
            { recordId: 'a1', attributes: { firstName: 'A1' } },
            { recordId: 'a2', attributes: { firstName: 'A2' } },
        ];
        const jobA = await processor.submitBatch({
            tenantId: 'tenant-1',
            entityType: 'Person',
            datasetRef: 'dataset-a',
            records: recordsA,
            createdBy: 'tester',
        });
        const recordsB = [
            { recordId: 'b1', attributes: { name: 'B1' } },
            { recordId: 'b2', attributes: { name: 'B2' } },
        ];
        const jobB = await processor.submitBatch({
            tenantId: 'tenant-2',
            entityType: 'Organization',
            datasetRef: 'dataset-b',
            records: recordsB,
            createdBy: 'tester',
        });
        const updateProgressA = globals_1.jest.fn();
        const updateProgressB = globals_1.jest.fn();
        await Promise.all([
            processor.processJob({
                data: { jobId: jobA.jobId, records: recordsA },
                updateProgress: updateProgressA,
            }),
            processor.processJob({
                data: { jobId: jobB.jobId, records: recordsB },
                updateProgress: updateProgressB,
            }),
        ]);
        (0, globals_1.expect)(jobA.processedRecords).toBe(2);
        (0, globals_1.expect)(jobB.processedRecords).toBe(2);
        (0, globals_1.expect)(jobA.status).toBe('COMPLETED');
        (0, globals_1.expect)(jobB.status).toBe('COMPLETED');
        (0, globals_1.expect)(transactionMock).toHaveBeenCalledTimes(4);
        (0, globals_1.expect)(updateProgressA).toHaveBeenCalled();
        (0, globals_1.expect)(updateProgressB).toHaveBeenCalled();
    });
});
