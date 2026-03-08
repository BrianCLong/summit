"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const BulkOperationService_js_1 = require("../BulkOperationService.js");
const handlers_js_1 = require("../handlers.js");
// Mock dependencies
globals_1.jest.mock('../../db/postgres.js', () => ({
    getPostgresPool: globals_1.jest.fn(() => ({
        connect: globals_1.jest.fn(() => ({
            query: globals_1.jest.fn(),
            release: globals_1.jest.fn()
        }))
    }))
}));
globals_1.jest.mock('../../config/logger.js', () => ({
    child: globals_1.jest.fn(() => ({
        info: globals_1.jest.fn(),
        error: globals_1.jest.fn(),
        debug: globals_1.jest.fn(),
        warn: globals_1.jest.fn()
    }))
}));
(0, globals_1.describe)('BulkOperationService', () => {
    let service;
    let context;
    let mockClient;
    let mockPool;
    (0, globals_1.beforeEach)(() => {
        // Create a complete mock client with all required methods
        mockClient = {
            query: globals_1.jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
            release: globals_1.jest.fn()
        };
        // Create mock pool that returns the mock client
        mockPool = {
            connect: globals_1.jest.fn().mockResolvedValue(mockClient),
            query: globals_1.jest.fn().mockResolvedValue({ rows: [], rowCount: 0 })
        };
        service = new BulkOperationService_js_1.BulkOperationService();
        service.setPool(mockPool);
        context = {
            tenantId: 'tenant-1',
            userId: 'user-1',
            requestId: 'req-1'
        };
        // Reset all mocks
        globals_1.jest.clearAllMocks();
    });
    (0, globals_1.afterEach)(() => {
        globals_1.jest.restoreAllMocks();
    });
    test('should execute best-effort bulk operation via handler spy', async () => {
        // Spy on the handler's execute method to bypass database calls
        const handler = handlers_js_1.handlers['tags/apply'];
        const executeSpy = globals_1.jest.spyOn(handler, 'execute').mockResolvedValue([
            { itemId: 'id1', status: 'success' },
            { itemId: 'id2', status: 'success' }
        ]);
        const payload = {
            items: [{ id: 'id1' }, { id: 'id2' }],
            requestId: 'req-1',
            operationType: 'tags/apply',
            params: { tags: ['test'] },
            atomic: false
        };
        const response = await service.process(context, payload);
        (0, globals_1.expect)(executeSpy).toHaveBeenCalledWith(payload.items, payload.params, globals_1.expect.objectContaining({ tenantId: 'tenant-1' }));
        (0, globals_1.expect)(response.summary.total).toBe(2);
        (0, globals_1.expect)(response.summary.success).toBe(2);
        (0, globals_1.expect)(response.summary.failed).toBe(0);
    });
    test('should fail for unsupported operation', async () => {
        const payload = {
            items: [{ id: 'id1' }],
            requestId: 'req-1',
            operationType: 'unknown/op',
            params: {},
            atomic: false
        };
        await (0, globals_1.expect)(service.process(context, payload)).rejects.toThrow('Unsupported bulk operation');
    });
    test('should handle atomic rollback when handler returns failures', async () => {
        // Spy on handler to return mixed results
        const handler = handlers_js_1.handlers['tags/apply'];
        const executeSpy = globals_1.jest.spyOn(handler, 'execute').mockResolvedValue([
            { itemId: 'id1', status: 'success' },
            { itemId: 'id2', status: 'failure', message: 'Simulated error' }
        ]);
        const payload = {
            items: [{ id: 'id1' }, { id: 'id2' }],
            requestId: 'req-1',
            operationType: 'tags/apply',
            params: { tags: ['test'] },
            atomic: true
        };
        const response = await service.process(context, payload);
        // Verify rollback was triggered
        (0, globals_1.expect)(mockClient.query).toHaveBeenCalledWith('BEGIN');
        (0, globals_1.expect)(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
        (0, globals_1.expect)(mockClient.release).toHaveBeenCalled();
        // All items should be marked as failed due to atomic rollback
        (0, globals_1.expect)(response.summary.failed).toBe(2);
        (0, globals_1.expect)(response.summary.success).toBe(0);
        (0, globals_1.expect)(response.results[0].status).toBe('failure');
        (0, globals_1.expect)(response.results[0].code).toBe('ATOMIC_ROLLBACK');
    });
    test('should commit atomic operation when all items succeed', async () => {
        const handler = handlers_js_1.handlers['tags/apply'];
        globals_1.jest.spyOn(handler, 'execute').mockResolvedValue([
            { itemId: 'id1', status: 'success' },
            { itemId: 'id2', status: 'success' }
        ]);
        const payload = {
            items: [{ id: 'id1' }, { id: 'id2' }],
            requestId: 'req-1',
            operationType: 'tags/apply',
            params: { tags: ['test'] },
            atomic: true
        };
        const response = await service.process(context, payload);
        // Verify commit was called
        (0, globals_1.expect)(mockClient.query).toHaveBeenCalledWith('BEGIN');
        (0, globals_1.expect)(mockClient.query).toHaveBeenCalledWith('COMMIT');
        (0, globals_1.expect)(mockClient.release).toHaveBeenCalled();
        (0, globals_1.expect)(response.summary.success).toBe(2);
        (0, globals_1.expect)(response.summary.failed).toBe(0);
    });
    test('should handle dry run without executing', async () => {
        const handler = handlers_js_1.handlers['tags/apply'];
        const executeSpy = globals_1.jest.spyOn(handler, 'execute');
        const payload = {
            items: [{ id: 'id1' }, { id: 'id2' }],
            requestId: 'req-1',
            operationType: 'tags/apply',
            params: { tags: ['test'] },
            atomic: false,
            dryRun: true
        };
        const response = await service.process(context, payload);
        // Handler should not be called in dry run
        (0, globals_1.expect)(executeSpy).not.toHaveBeenCalled();
        (0, globals_1.expect)(response.summary.total).toBe(2);
        (0, globals_1.expect)(response.summary.success).toBe(2);
    });
});
