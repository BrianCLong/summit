"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const pg_1 = require("pg");
const postgres_state_store_1 = require("../postgres-state-store");
globals_1.jest.mock('pg', () => {
    const mClient = {
        query: globals_1.jest.fn(),
        release: globals_1.jest.fn(),
    };
    const mPool = {
        connect: globals_1.jest.fn(() => Promise.resolve(mClient)),
        query: globals_1.jest.fn(),
    };
    return { Pool: globals_1.jest.fn(() => mPool) };
});
(0, globals_1.describe)('PostgresStateStore', () => {
    let store;
    let mockPool;
    let mockClient;
    (0, globals_1.beforeEach)(async () => {
        globals_1.jest.clearAllMocks();
        mockPool = new pg_1.Pool();
        mockClient = await mockPool.connect();
        store = new postgres_state_store_1.PostgresStateStore(mockPool);
    });
    (0, globals_1.it)('should create a run with idempotency and initial event', async () => {
        const context = {
            run_id: 'test-run-id',
            workflow: { name: 'test-wf', version: '1.0', steps: [] },
            tenant_id: 'tenant-1',
            triggered_by: 'user-1',
            environment: 'prod',
            parameters: {},
            idempotency_key: 'idem-1'
        };
        mockClient.query.mockResolvedValueOnce({ rows: [] }); // BEGIN
        mockClient.query.mockResolvedValueOnce({ rows: [] }); // INSERT workflow_runs
        mockClient.query.mockResolvedValueOnce({ rows: [] }); // INSERT workflow_events
        mockClient.query.mockResolvedValueOnce({ rows: [] }); // COMMIT
        await store.createRun(context);
        (0, globals_1.expect)(mockClient.query).toHaveBeenCalledWith(globals_1.expect.stringContaining('BEGIN'));
        (0, globals_1.expect)(mockClient.query).toHaveBeenCalledWith(globals_1.expect.stringContaining('INSERT INTO workflow_runs'), globals_1.expect.arrayContaining(['test-run-id', 'test-wf', 'idem-1']));
    });
    (0, globals_1.it)('should update step execution with event and outbox entry', async () => {
        const execution = {
            step_id: 'step-1',
            run_id: 'run-1',
            status: 'succeeded',
            attempt: 1,
            metadata: {},
            output: { result: 'ok' }
        };
        mockClient.query.mockResolvedValue({ rows: [] });
        await store.updateStepExecution(execution);
        (0, globals_1.expect)(mockClient.query).toHaveBeenCalledWith(globals_1.expect.stringContaining('UPDATE step_executions'), globals_1.expect.anything());
        (0, globals_1.expect)(mockClient.query).toHaveBeenCalledWith(globals_1.expect.stringContaining('INSERT INTO workflow_events'), globals_1.expect.arrayContaining(['run-1', 'step-1', 'step_succeeded']));
        (0, globals_1.expect)(mockClient.query).toHaveBeenCalledWith(globals_1.expect.stringContaining('INSERT INTO workflow_outbox'), globals_1.expect.arrayContaining(['run-1', 'step.succeeded']));
    });
});
