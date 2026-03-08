"use strict";
// server/src/lib/state/tests/state.test.ts
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const consistency_engine_js_1 = require("../consistency-engine.js");
const conflict_resolver_js_1 = require("../conflict-resolver.js");
const distributed_transaction_js_1 = require("../distributed-transaction.js");
const state_sync_js_1 = require("../state-sync.js");
const ws_1 = require("ws");
globals_1.jest.mock('ws');
(0, globals_1.describe)('State Management', () => {
    (0, globals_1.describe)('ConsistencyEngine', () => {
        let engine;
        (0, globals_1.beforeEach)(() => {
            engine = new consistency_engine_js_1.ConsistencyEngine();
        });
        (0, globals_1.it)('should handle strong consistency reads/writes', () => {
            engine.write('key', 'value', { consistency: consistency_engine_js_1.ConsistencyLevel.Strong });
            const value = engine.read('key', { consistency: consistency_engine_js_1.ConsistencyLevel.Strong });
            (0, globals_1.expect)(value).toBe('value');
        });
        (0, globals_1.it)('should handle session consistency', () => {
            const sessionId = 'session1';
            engine.write('key', 'sessionValue', { consistency: consistency_engine_js_1.ConsistencyLevel.Session, sessionId });
            const value = engine.read('key', { consistency: consistency_engine_js_1.ConsistencyLevel.Session, sessionId });
            (0, globals_1.expect)(value).toBe('sessionValue');
        });
        (0, globals_1.it)('should enforce monotonic reads', () => {
            (0, globals_1.expect)(() => engine.enforceMonotonicReads(2, 1)).toThrow('Monotonic read violation detected.');
        });
    });
    (0, globals_1.describe)('ConflictResolver', () => {
        let resolver;
        (0, globals_1.beforeEach)(() => {
            resolver = new conflict_resolver_js_1.ConflictResolver();
        });
        (0, globals_1.it)('should merge G-Counters', () => {
            const counterA = new conflict_resolver_js_1.GCounter('A');
            counterA.increment(5);
            const counterB = new conflict_resolver_js_1.GCounter('B');
            counterB.increment(3);
            const merged = counterA.merge(counterB);
            (0, globals_1.expect)(merged.value).toBe(8);
        });
        (0, globals_1.it)('should merge PN-Counters', () => {
            const counterA = new conflict_resolver_js_1.PNCounter('A');
            counterA.increment(10);
            counterA.decrement(2);
            const counterB = new conflict_resolver_js_1.PNCounter('B');
            counterB.increment(5);
            counterB.decrement(8);
            const merged = counterA.merge(counterB);
            (0, globals_1.expect)(merged.value).toBe(5);
        });
        (0, globals_1.it)('should merge LWW-Registers', () => {
            const registerA = new conflict_resolver_js_1.LWWRegister('A', 'foo', 100);
            const registerB = new conflict_resolver_js_1.LWWRegister('B', 'bar', 200);
            const merged = registerA.merge(registerB);
            (0, globals_1.expect)(merged.value).toBe('bar');
        });
        (0, globals_1.it)('should merge OR-Sets', () => {
            const setA = new conflict_resolver_js_1.ORSet('A');
            setA.add('apple');
            setA.add('banana');
            const setB = new conflict_resolver_js_1.ORSet('B');
            setB.add('banana');
            setB.add('cherry');
            setA.remove('apple');
            const merged = setA.merge(setB);
            (0, globals_1.expect)(merged.value).toEqual(new Set(['banana', 'cherry']));
        });
        (0, globals_1.it)('should handle concurrent adds and removes in OR-Sets', () => {
            const setA = new conflict_resolver_js_1.ORSet('A');
            setA.add('apple');
            const setB = new conflict_resolver_js_1.ORSet('B');
            setB.add('apple');
            setB.remove('apple');
            const merged = setA.merge(setB);
            (0, globals_1.expect)(merged.value).toEqual(new Set(['apple']));
        });
    });
    (0, globals_1.describe)('DistributedTransaction', () => {
        (0, globals_1.it)('should successfully commit a 2PC transaction', () => {
            const coordinator = new distributed_transaction_js_1.TwoPhaseCommitCoordinator();
            const participant1 = {
                canCommit: () => true,
                commit: globals_1.jest.fn(),
                rollback: globals_1.jest.fn(),
            };
            const participant2 = {
                canCommit: () => true,
                commit: globals_1.jest.fn(),
                rollback: globals_1.jest.fn(),
            };
            coordinator.addParticipant(participant1);
            coordinator.addParticipant(participant2);
            const result = coordinator.execute();
            (0, globals_1.expect)(result).toBe(true);
            (0, globals_1.expect)(participant1.commit).toHaveBeenCalled();
            (0, globals_1.expect)(participant2.commit).toHaveBeenCalled();
        });
        (0, globals_1.it)('should rollback a 2PC transaction if a participant fails', () => {
            const coordinator = new distributed_transaction_js_1.TwoPhaseCommitCoordinator();
            const participant1 = {
                canCommit: () => true,
                commit: globals_1.jest.fn(),
                rollback: globals_1.jest.fn(),
            };
            const participant2 = {
                canCommit: () => false,
                commit: globals_1.jest.fn(),
                rollback: globals_1.jest.fn(),
            };
            coordinator.addParticipant(participant1);
            coordinator.addParticipant(participant2);
            const result = coordinator.execute();
            (0, globals_1.expect)(result).toBe(false);
            (0, globals_1.expect)(participant1.rollback).toHaveBeenCalled();
            (0, globals_1.expect)(participant2.rollback).toHaveBeenCalled();
        });
        (0, globals_1.it)('should successfully execute a saga', async () => {
            const coordinator = new distributed_transaction_js_1.SagaCoordinator();
            const action1 = {
                execute: globals_1.jest.fn().mockResolvedValue(undefined),
                compensate: globals_1.jest.fn().mockResolvedValue(undefined),
            };
            const action2 = {
                execute: globals_1.jest.fn().mockResolvedValue(undefined),
                compensate: globals_1.jest.fn().mockResolvedValue(undefined),
            };
            coordinator.addAction(action1);
            coordinator.addAction(action2);
            const result = await coordinator.execute();
            (0, globals_1.expect)(result).toBe(true);
            (0, globals_1.expect)(action1.execute).toHaveBeenCalled();
            (0, globals_1.expect)(action2.execute).toHaveBeenCalled();
        });
        (0, globals_1.it)('should compensate a saga if an action fails', async () => {
            const coordinator = new distributed_transaction_js_1.SagaCoordinator();
            const action1 = {
                execute: globals_1.jest.fn().mockResolvedValue(undefined),
                compensate: globals_1.jest.fn().mockResolvedValue(undefined),
            };
            const action2 = {
                execute: globals_1.jest.fn().mockRejectedValue(new Error('Action failed')),
                compensate: globals_1.jest.fn().mockResolvedValue(undefined),
            };
            coordinator.addAction(action1);
            coordinator.addAction(action2);
            const result = await coordinator.execute();
            (0, globals_1.expect)(result).toBe(false);
            (0, globals_1.expect)(action1.compensate).toHaveBeenCalled();
        });
    });
    (0, globals_1.describe)('StateSyncClient', () => {
        let client;
        const mockWebSocket = {
            send: globals_1.jest.fn(),
            on: globals_1.jest.fn(),
        };
        (0, globals_1.beforeEach)(() => {
            ws_1.WebSocket.mockImplementation(() => mockWebSocket);
            client = new state_sync_js_1.StateSyncClient('ws://localhost:8080');
        });
        (0, globals_1.it)('should perform optimistic updates', () => {
            client.performOperation({ type: 'update', key: 'foo', value: 'bar' });
            const state = client.getState();
            (0, globals_1.expect)(state.get('foo')).toBe('bar');
        });
        (0, globals_1.it)('should queue operations when offline', () => {
            client.performOperation({ type: 'update', key: 'foo', value: 'bar' });
            (0, globals_1.expect)(mockWebSocket.send).not.toHaveBeenCalled();
        });
    });
});
