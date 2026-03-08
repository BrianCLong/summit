"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const playbook_executor_js_1 = require("../playbook-executor.js");
let workerProcessor = null;
const queuedJobs = [];
const mockQueue = {
    add: globals_1.jest.fn(async (name, data, opts) => {
        queuedJobs.push({ name, data, opts });
    }),
    close: globals_1.jest.fn(),
};
const makePlaybook = () => ({
    id: 'pb-1',
    name: 'Test Playbook',
    steps: [
        { id: 'step-1', kind: 'action', action: 'mock.first' },
        { id: 'step-2', kind: 'action', action: 'mock.second' },
    ],
});
(0, globals_1.describe)('PlaybookExecutorService', () => {
    (0, globals_1.beforeEach)(() => {
        playbook_executor_js_1.PlaybookExecutorService.instance = null;
        queuedJobs.length = 0;
        mockQueue.add.mockReset();
        mockQueue.add.mockImplementation(async (name, data, opts) => {
            queuedJobs.push({ name, data, opts });
        });
        workerProcessor = null;
        globals_1.jest.useFakeTimers();
    });
    (0, globals_1.afterEach)(() => {
        globals_1.jest.useRealTimers();
    });
    (0, globals_1.it)('validates playbook schema', async () => {
        const service = playbook_executor_js_1.PlaybookExecutorService.getInstance({
            redisConnection: {},
            queueFactory: () => mockQueue,
            workerFactory: (_name, processor) => {
                workerProcessor = processor;
                return { close: globals_1.jest.fn() };
            },
        });
        const invalidPlaybook = { id: 'pb-1', name: 'Invalid' };
        await (0, globals_1.expect)(service.executePlaybook(invalidPlaybook, {
            runId: 'run-1',
            playbookId: 'pb-1',
            idempotencyKey: 'run-1',
        })).rejects.toThrow('Invalid playbook schema');
        await service.shutdown();
    });
    (0, globals_1.it)('executes steps in order with idempotent run keys', async () => {
        const service = playbook_executor_js_1.PlaybookExecutorService.getInstance({
            redisConnection: {},
            queueFactory: () => mockQueue,
            workerFactory: (_name, processor) => {
                workerProcessor = processor;
                return { close: globals_1.jest.fn() };
            },
        });
        const executionOrder = [];
        service.registerActionHandler('mock.first', async () => {
            executionOrder.push('step-1');
        });
        service.registerActionHandler('mock.second', async () => {
            executionOrder.push('step-2');
        });
        const playbook = makePlaybook();
        const runContext = {
            runId: 'run-1',
            playbookId: playbook.id,
            idempotencyKey: 'idempotent-key',
        };
        const runPromise = service.executePlaybook(playbook, runContext);
        const runPromiseDuplicate = service.executePlaybook(playbook, runContext);
        (0, globals_1.expect)(workerProcessor).not.toBeNull();
        (0, globals_1.expect)(queuedJobs).toHaveLength(1);
        const firstJob = queuedJobs.shift();
        (0, globals_1.expect)(firstJob).toBeDefined();
        await workerProcessor?.({ data: firstJob?.data });
        (0, globals_1.expect)(queuedJobs).toHaveLength(1);
        const secondJob = queuedJobs.shift();
        (0, globals_1.expect)(secondJob).toBeDefined();
        await workerProcessor?.({ data: secondJob?.data });
        globals_1.jest.advanceTimersByTime(50);
        await Promise.resolve();
        const result = await runPromise;
        const duplicateResult = await runPromiseDuplicate;
        (0, globals_1.expect)(result.status).toBe('succeeded');
        (0, globals_1.expect)(duplicateResult.status).toBe('succeeded');
        (0, globals_1.expect)(executionOrder).toEqual(['step-1', 'step-2']);
        (0, globals_1.expect)(mockQueue.add).toHaveBeenCalledTimes(2);
        await service.shutdown();
    });
});
