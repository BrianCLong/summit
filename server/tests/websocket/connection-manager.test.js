"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const connectionManager_1 = require("../../src/websocket/connectionManager");
class MockWebSocket {
    failSend;
    messages = [];
    readyState = 1;
    bufferedAmount = 0;
    constructor(failSend = false) {
        this.failSend = failSend;
    }
    send(data) {
        if (this.failSend) {
            throw new Error('send failed');
        }
        this.messages.push(data);
    }
    close = globals_1.jest.fn();
    getBufferedAmount() {
        return this.bufferedAmount;
    }
}
(0, globals_1.describe)('WebSocketConnectionPool', () => {
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.useFakeTimers();
        globals_1.jest.setSystemTime(new Date('2024-01-01T00:00:00Z'));
    });
    (0, globals_1.afterEach)(() => {
        globals_1.jest.useRealTimers();
    });
    (0, globals_1.it)('queues messages during network interruptions and replays after reconnection', () => {
        const pool = new connectionManager_1.WebSocketConnectionPool({
            rateLimitPerSecond: 5,
            queueFlushInterval: 100,
            replayBatchSize: 10,
        });
        const ws = new MockWebSocket();
        const managed = pool.registerConnection('tenantA@userA', ws, {
            id: 'tenantA@userA',
            tenantId: 'tenantA',
            userId: 'userA',
        });
        (0, globals_1.expect)(managed.getState()).toBe(connectionManager_1.ConnectionState.CONNECTED);
        const initialMessages = ws.messages.filter((msg) => !msg.includes('connection_ack'));
        (0, globals_1.expect)(initialMessages).toHaveLength(0);
        pool.send('tenantA@userA', JSON.stringify({ type: 'initial' }));
        (0, globals_1.expect)(ws.messages).toHaveLength(2);
        pool.handleNetworkChange('offline');
        (0, globals_1.expect)(managed.getState()).toBe(connectionManager_1.ConnectionState.RECONNECTING);
        pool.send('tenantA@userA', JSON.stringify({ type: 'queued' }));
        (0, globals_1.expect)(managed.getQueueSize()).toBe(1);
        const replacement = new MockWebSocket();
        pool.rebindConnection('tenantA@userA', replacement);
        (0, globals_1.expect)(managed.getState()).toBe(connectionManager_1.ConnectionState.CONNECTED);
        globals_1.jest.runOnlyPendingTimers();
        (0, globals_1.expect)(replacement.messages.some((msg) => msg.includes('queued'))).toBe(true);
        (0, globals_1.expect)(managed.getQueueSize()).toBe(0);
    });
    (0, globals_1.it)('marks connections as degraded and notifies clients on server restart', () => {
        const pool = new connectionManager_1.WebSocketConnectionPool({ queueFlushInterval: 50 });
        const ws = new MockWebSocket();
        const managed = pool.registerConnection('tenantB@userB', ws, {
            id: 'tenantB@userB',
            tenantId: 'tenantB',
            userId: 'userB',
        });
        pool.handleServerRestart('maintenance');
        (0, globals_1.expect)(managed.getState()).toBe(connectionManager_1.ConnectionState.DEGRADED);
        (0, globals_1.expect)(managed.getQueueSize()).toBeGreaterThan(0);
        const restartReplacement = new MockWebSocket();
        pool.rebindConnection('tenantB@userB', restartReplacement);
        globals_1.jest.runOnlyPendingTimers();
        const restartMessages = restartReplacement.messages
            .map((msg) => {
            try {
                return JSON.parse(msg);
            }
            catch (error) {
                return null;
            }
        })
            .filter(Boolean);
        (0, globals_1.expect)(restartMessages.some((payload) => payload?.type === 'server_restart')).toBe(true);
    });
    (0, globals_1.it)('applies rate limiting and backpressure handling under load', () => {
        const pool = new connectionManager_1.WebSocketConnectionPool({
            rateLimitPerSecond: 1,
            queueFlushInterval: 100,
            backpressureThreshold: 5,
        });
        const ws = new MockWebSocket();
        ws.bufferedAmount = 10;
        const managed = pool.registerConnection('tenantC@userC', ws, {
            id: 'tenantC@userC',
            tenantId: 'tenantC',
            userId: 'userC',
        });
        const firstSend = pool.send('tenantC@userC', JSON.stringify({ type: 'burst-1' }));
        (0, globals_1.expect)(firstSend).toBe(false);
        (0, globals_1.expect)(managed.getQueueSize()).toBe(2);
        ws.bufferedAmount = 0;
        const secondSend = pool.send('tenantC@userC', JSON.stringify({ type: 'burst-2' }));
        (0, globals_1.expect)(secondSend).toBe(false);
        (0, globals_1.expect)(managed.getQueueSize()).toBe(3);
        globals_1.jest.advanceTimersByTime(1000);
        globals_1.jest.runOnlyPendingTimers();
        (0, globals_1.expect)(ws.messages.filter((msg) => msg.includes('burst-'))).toHaveLength(2);
        (0, globals_1.expect)(managed.getQueueSize()).toBe(0);
    });
});
