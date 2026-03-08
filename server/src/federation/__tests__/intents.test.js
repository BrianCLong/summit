"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const intents_js_1 = require("../intents.js");
globals_1.jest.mock('../../jobs/job.manager.js', () => ({
    jobManager: { getQueue: globals_1.jest.fn() },
}));
globals_1.jest.mock('../../provenance/ledger.js', () => ({
    provenanceLedger: { appendEntry: globals_1.jest.fn() },
}));
globals_1.jest.mock('../../graph/partition/ShardManager.js', () => {
    const mockShardManager = { getDriver: globals_1.jest.fn() };
    return {
        ShardManager: {
            getInstance: globals_1.jest.fn(() => mockShardManager),
        },
        __mockShardManager: mockShardManager,
    };
});
const { jobManager } = globals_1.jest.requireMock('../../jobs/job.manager.js');
const { provenanceLedger } = globals_1.jest.requireMock('../../provenance/ledger.js');
const { ShardManager, __mockShardManager } = globals_1.jest.requireMock('../../graph/partition/ShardManager.js');
const mockShardManager = __mockShardManager;
const mockQueue = { add: globals_1.jest.fn(() => Promise.resolve({ id: 'job-123' })) };
describe('IntentService', () => {
    let service;
    let mockDriver;
    let mockSession;
    beforeEach(() => {
        // Reset mocks
        globals_1.jest.clearAllMocks();
        // Setup JobManager mock
        mockQueue.add.mockClear();
        jobManager.getQueue.mockReturnValue(mockQueue);
        // Setup ShardManager mock
        ShardManager.getInstance.mockReturnValue(mockShardManager);
        const mockRun = globals_1.jest.fn(() => Promise.resolve({ records: [] }));
        mockSession = {
            executeWrite: globals_1.jest.fn(async (callback) => {
                return await callback({
                    run: mockRun,
                });
            }),
            close: globals_1.jest.fn(() => Promise.resolve()),
        };
        mockDriver = {
            session: globals_1.jest.fn().mockReturnValue(mockSession),
        };
        mockShardManager.getDriver.mockReturnValue(mockDriver);
        // Setup Provenance mock
        provenanceLedger.appendEntry.mockClear();
        // Get Service Instance
        service = intents_js_1.IntentService.getInstance();
    });
    describe('enqueueIntent', () => {
        it('should add job to the queue', async () => {
            const intentId = await service.enqueueIntent('shard-01', 'user-123', 'UPSERT_NODE', { key: 'value' });
            expect(jobManager.getQueue).toHaveBeenCalledWith('intents-queue');
            expect(mockQueue.add).toHaveBeenCalledWith('process-intent', expect.objectContaining({
                shardId: 'shard-01',
                actorId: 'user-123',
                op: 'UPSERT_NODE',
            }), expect.anything());
            expect(intentId).toBeDefined();
        });
        it('should throw if queue not found', async () => {
            jobManager.getQueue.mockReturnValue(undefined);
            await expect(service.enqueueIntent('shard-01', 'user-123', 'UPSERT_NODE', { key: 'value' })).rejects.toThrow('Queue intents-queue not initialized');
        });
    });
    describe('applyIntent', () => {
        it('should execute UPSERT_NODE successfully', async () => {
            const intent = {
                id: 'intent-1',
                shardId: 'shard-01',
                actorId: 'user-123',
                ts: Date.now(),
                op: 'UPSERT_NODE',
                payload: {
                    labels: ['Person'],
                    keyField: 'email',
                    keyValue: 'test@example.com',
                    properties: { name: 'Test User' }
                },
                policyTags: ['public']
            };
            await service.applyIntent(intent);
            // Verify Shard execution
            expect(mockDriver.session).toHaveBeenCalled();
            expect(mockSession.executeWrite).toHaveBeenCalled();
            // Verify Provenance
            expect(provenanceLedger.appendEntry).toHaveBeenCalledWith(expect.objectContaining({
                actionType: 'INTENT_APPLIED',
                resourceId: 'intent-1',
                payload: expect.objectContaining({ status: 'SUCCESS' })
            }));
        });
        it('should throw on policy violation', async () => {
            const intent = {
                id: 'intent-2',
                shardId: 'shard-01',
                actorId: 'bad-actor',
                ts: Date.now(),
                op: 'DELETE',
                payload: { keyField: 'id', keyValue: '123' },
                policyTags: ['deny-all']
            };
            await expect(service.applyIntent(intent)).rejects.toThrow('POLICY_DENY');
            expect(mockDriver.session).not.toHaveBeenCalled();
        });
        it('should throw if shard not found', async () => {
            mockShardManager.getDriver.mockReturnValue(undefined);
            const intent = {
                id: 'intent-3',
                shardId: 'missing-shard',
                actorId: 'user',
                ts: Date.now(),
                op: 'DELETE',
                payload: {},
                policyTags: []
            };
            await expect(service.applyIntent(intent)).rejects.toThrow(/Shard missing-shard not found/);
        });
    });
});
