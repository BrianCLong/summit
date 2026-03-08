"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const maestro_js_1 = require("../maestro.js");
// Mock Socket.io structures
const mockJoin = globals_1.jest.fn();
const mockLeave = globals_1.jest.fn();
const mockEmit = globals_1.jest.fn();
const mockOn = globals_1.jest.fn();
const mockSocket = {
    id: 'socket-1',
    user: { id: 'user-1', email: 'test@example.com', username: 'tester' },
    tenantId: 'tenant-1',
    join: mockJoin,
    leave: mockLeave,
    emit: mockEmit,
    on: mockOn,
};
const mockIo = {
    to: globals_1.jest.fn().mockReturnThis(),
    emit: globals_1.jest.fn(),
};
(0, globals_1.describe)('Maestro WebSocket Handlers', () => {
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        // Re-register handlers for each test to capture callbacks
        (0, maestro_js_1.registerMaestroHandlers)(mockIo, mockSocket);
    });
    (0, globals_1.it)('should register all event handlers', () => {
        (0, globals_1.expect)(mockOn).toHaveBeenCalledWith('maestro:subscribe_run', globals_1.expect.any(Function));
        (0, globals_1.expect)(mockOn).toHaveBeenCalledWith('maestro:unsubscribe_run', globals_1.expect.any(Function));
        (0, globals_1.expect)(mockOn).toHaveBeenCalledWith('maestro:subscribe_logs', globals_1.expect.any(Function));
        (0, globals_1.expect)(mockOn).toHaveBeenCalledWith('maestro:unsubscribe_logs', globals_1.expect.any(Function));
        (0, globals_1.expect)(mockOn).toHaveBeenCalledWith('maestro:subscribe_status', globals_1.expect.any(Function));
        (0, globals_1.expect)(mockOn).toHaveBeenCalledWith('maestro:unsubscribe_status', globals_1.expect.any(Function));
    });
    (0, globals_1.it)('should handle run subscription', async () => {
        // Extract the callback for 'maestro:subscribe_run'
        const subscribeCallback = mockOn.mock.calls.find(call => call[0] === 'maestro:subscribe_run')[1];
        await subscribeCallback({ runId: 'run-123' });
        (0, globals_1.expect)(mockJoin).toHaveBeenCalledWith('tenant:tenant-1:run:run-123');
        (0, globals_1.expect)(mockEmit).toHaveBeenCalledWith('maestro:subscribed', { type: 'run', runId: 'run-123' });
    });
    (0, globals_1.it)('should handle invalid run subscription (null payload)', async () => {
        const subscribeCallback = mockOn.mock.calls.find(call => call[0] === 'maestro:subscribe_run')[1];
        // Should not throw and should not join
        await subscribeCallback(null);
        (0, globals_1.expect)(mockJoin).not.toHaveBeenCalled();
        (0, globals_1.expect)(mockEmit).not.toHaveBeenCalled();
    });
    (0, globals_1.it)('should handle invalid run subscription (missing runId)', async () => {
        const subscribeCallback = mockOn.mock.calls.find(call => call[0] === 'maestro:subscribe_run')[1];
        await subscribeCallback({});
        (0, globals_1.expect)(mockJoin).not.toHaveBeenCalled();
        (0, globals_1.expect)(mockEmit).not.toHaveBeenCalled();
    });
    (0, globals_1.it)('should handle run unsubscription', async () => {
        const unsubscribeCallback = mockOn.mock.calls.find(call => call[0] === 'maestro:unsubscribe_run')[1];
        await unsubscribeCallback({ runId: 'run-123' });
        (0, globals_1.expect)(mockLeave).toHaveBeenCalledWith('tenant:tenant-1:run:run-123');
        (0, globals_1.expect)(mockEmit).toHaveBeenCalledWith('maestro:unsubscribed', { type: 'run', runId: 'run-123' });
    });
    (0, globals_1.it)('should handle log subscription', async () => {
        const subscribeCallback = mockOn.mock.calls.find(call => call[0] === 'maestro:subscribe_logs')[1];
        await subscribeCallback({ runId: 'run-123' });
        (0, globals_1.expect)(mockJoin).toHaveBeenCalledWith('tenant:tenant-1:logs:run-123');
        (0, globals_1.expect)(mockEmit).toHaveBeenCalledWith('maestro:subscribed', { type: 'logs', runId: 'run-123' });
    });
    (0, globals_1.it)('should handle global status subscription', async () => {
        const subscribeCallback = mockOn.mock.calls.find(call => call[0] === 'maestro:subscribe_status')[1];
        await subscribeCallback();
        (0, globals_1.expect)(mockJoin).toHaveBeenCalledWith('tenant:tenant-1:maestro:status');
        (0, globals_1.expect)(mockEmit).toHaveBeenCalledWith('maestro:subscribed', { type: 'status' });
    });
    (0, globals_1.it)('should handle errors during subscription', async () => {
        mockJoin.mockRejectedValueOnce(new Error('Connection failed'));
        const subscribeCallback = mockOn.mock.calls.find(call => call[0] === 'maestro:subscribe_run')[1];
        await subscribeCallback({ runId: 'run-123' });
        (0, globals_1.expect)(mockEmit).toHaveBeenCalledWith('maestro:error', globals_1.expect.objectContaining({
            code: 'SUBSCRIPTION_FAILED'
        }));
    });
});
