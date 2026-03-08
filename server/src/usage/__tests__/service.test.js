"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const mockWrite = globals_1.jest.fn(async (..._args) => undefined);
const mockWithTransaction = globals_1.jest.fn(async (..._args) => undefined);
const loggerMock = {
    child: globals_1.jest.fn(),
    debug: globals_1.jest.fn(),
    error: globals_1.jest.fn(),
    info: globals_1.jest.fn(),
    warn: globals_1.jest.fn(),
};
globals_1.jest.unstable_mockModule('../../db/postgres.js', () => ({
    getPostgresPool: globals_1.jest.fn(() => ({
        write: mockWrite,
        withTransaction: mockWithTransaction,
    })),
}));
globals_1.jest.unstable_mockModule('../../utils/logger.js', () => ({
    logger: loggerMock,
    default: loggerMock,
}));
(0, globals_1.describe)('PostgresUsageMeteringService', () => {
    let ServiceClass;
    let service;
    let baseEvent;
    let getPostgresPool;
    (0, globals_1.beforeAll)(async () => {
        ({ PostgresUsageMeteringService: ServiceClass } = await Promise.resolve().then(() => __importStar(require('../service.js'))));
        ({ getPostgresPool } = await Promise.resolve().then(() => __importStar(require('../../db/postgres.js'))));
    });
    (0, globals_1.beforeEach)(async () => {
        mockWrite.mockClear();
        mockWithTransaction.mockClear();
        getPostgresPool.mockReturnValue({
            write: mockWrite,
            withTransaction: mockWithTransaction,
        });
        loggerMock.debug.mockClear();
        loggerMock.error.mockClear();
        loggerMock.info.mockClear();
        loggerMock.warn.mockClear();
        loggerMock.child.mockClear();
        loggerMock.child.mockReturnValue(loggerMock);
        service = new ServiceClass();
        baseEvent = {
            id: 'event-1',
            tenantId: 'tenant-123',
            principalId: 'user-456',
            dimension: 'llm.tokens',
            quantity: 100,
            unit: 'tokens',
            source: 'unit-test',
            metadata: { scope: 'test' },
            occurredAt: '2025-12-30T22:21:04Z',
            recordedAt: '2025-12-30T22:22:04Z',
        };
    });
    (0, globals_1.it)('records a single usage event with parameterized insert', async () => {
        await service.record(baseEvent);
        const createCall = mockWrite.mock.calls.find((call) => {
            const [sql] = call;
            return sql.includes('CREATE TABLE IF NOT EXISTS usage_events');
        });
        const insertCall = mockWrite.mock.calls.find((call) => {
            const [sql] = call;
            return sql.startsWith('INSERT INTO usage_events');
        });
        (0, globals_1.expect)(createCall).toBeDefined();
        (0, globals_1.expect)(insertCall?.[1]).toEqual([
            baseEvent.id,
            baseEvent.tenantId,
            baseEvent.principalId,
            baseEvent.dimension,
            baseEvent.quantity,
            baseEvent.unit,
            baseEvent.source,
            JSON.stringify(baseEvent.metadata),
            new Date(baseEvent.occurredAt),
            new Date(baseEvent.recordedAt),
        ]);
    });
    (0, globals_1.it)('records a batch of usage events within a single transaction', async () => {
        const txQuery = globals_1.jest.fn(async (..._args) => undefined);
        mockWithTransaction.mockImplementation(async (callback) => {
            await callback({ query: txQuery });
        });
        const secondEvent = {
            ...baseEvent,
            id: 'event-2',
            quantity: 50,
            occurredAt: '2025-12-30T23:21:04Z',
            recordedAt: '2025-12-30T23:22:04Z',
        };
        await service.recordBatch([baseEvent, secondEvent]);
        (0, globals_1.expect)(mockWrite).toHaveBeenCalledTimes(1);
        (0, globals_1.expect)(mockWithTransaction).toHaveBeenCalledTimes(1);
        (0, globals_1.expect)(txQuery).toHaveBeenCalledTimes(1);
        const [query, params] = txQuery.mock.calls[0];
        (0, globals_1.expect)(query).toContain('INSERT INTO usage_events');
        (0, globals_1.expect)(query).toContain('ON CONFLICT (id) DO NOTHING');
        (0, globals_1.expect)(params).toHaveLength(20);
        (0, globals_1.expect)(params[0]).toBe(baseEvent.id);
        (0, globals_1.expect)(params[10]).toBe(secondEvent.id);
    });
    (0, globals_1.it)('skips batch writes when there are no events', async () => {
        await service.recordBatch([]);
        (0, globals_1.expect)(mockWrite).not.toHaveBeenCalled();
        (0, globals_1.expect)(mockWithTransaction).not.toHaveBeenCalled();
    });
    (0, globals_1.it)('creates the usage_events table only once per instance', async () => {
        await service.record(baseEvent);
        await service.record({ ...baseEvent, id: 'event-3' });
        const createCalls = mockWrite.mock.calls.filter((call) => {
            const [sql] = call;
            return sql.includes('CREATE TABLE IF NOT EXISTS usage_events');
        });
        (0, globals_1.expect)(createCalls).toHaveLength(1);
    });
});
