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
const capturedConfigs = [];
const mockQuery = globals_1.jest.fn();
const mockRelease = globals_1.jest.fn();
const mockPoolConnect = globals_1.jest.fn();
const mockPoolEnd = globals_1.jest.fn();
globals_1.jest.mock('pg', () => {
    const Pool = globals_1.jest.fn((config) => {
        capturedConfigs.push(config);
        return {
            connect: mockPoolConnect,
            end: mockPoolEnd,
            totalCount: 0,
            idleCount: 0,
            waitingCount: 0,
            on: globals_1.jest.fn(),
        };
    });
    return { Pool };
});
describe('intelgraph-api db pool', () => {
    beforeEach(() => {
        globals_1.jest.resetModules();
        capturedConfigs.length = 0;
        mockQuery.mockReset();
        mockRelease.mockReset();
        mockPoolConnect.mockReset();
        mockPoolEnd.mockReset();
        mockPoolEnd.mockResolvedValue(undefined);
        mockPoolConnect.mockResolvedValue({
            query: mockQuery,
            release: mockRelease,
        });
        mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
        process.env.DB_POOL_TUNING = '1';
        process.env.PG_CONNECTION = 'postgres://localhost/testdb';
        delete process.env.DB_POOL_MAX;
    });
    afterEach(async () => {
        const { closeDbPool } = await Promise.resolve().then(() => __importStar(require('../../../apps/intelgraph-api/src/lib/dbPool.js')));
        await closeDbPool();
    });
    it('applies tuning options when DB_POOL_TUNING is enabled', async () => {
        process.env.DB_POOL_MAX = '250';
        const { createDbClient } = await Promise.resolve().then(() => __importStar(require('../../../apps/intelgraph-api/src/lib/dbPool.js')));
        createDbClient();
        expect(capturedConfigs[0]).toMatchObject({
            max: expect.any(Number),
            statement_timeout: expect.any(Number),
            idle_in_transaction_session_timeout: expect.any(Number),
            maxLifetimeSeconds: expect.any(Number),
            maxUses: expect.any(Number),
        });
        expect(capturedConfigs[0].max).toBe(100);
    });
    it('wraps read queries in read-only transactions with prepared statements', async () => {
        const { createDbClient } = await Promise.resolve().then(() => __importStar(require('../../../apps/intelgraph-api/src/lib/dbPool.js')));
        const db = createDbClient();
        await db.any('SELECT * FROM widgets WHERE id = $1', ['widget-1']);
        expect(mockQuery).toHaveBeenCalledWith('BEGIN');
        expect(mockQuery.mock.calls.find(([arg]) => arg === 'SET TRANSACTION READ ONLY')).toBeTruthy();
        const preparedCall = mockQuery.mock.calls.find(([arg]) => typeof arg === 'object' &&
            arg.name &&
            arg.text?.includes('SELECT * FROM widgets'));
        expect(preparedCall?.[0]).toMatchObject({
            name: expect.stringMatching(/^stmt_/),
        });
        expect(mockQuery).toHaveBeenCalledWith('COMMIT');
    });
    it('emits pool metrics for scraping', async () => {
        const { metricsRegistry, createDbClient } = await Promise.resolve().then(() => __importStar(require('../../../apps/intelgraph-api/src/lib/dbPool.js')));
        const db = createDbClient();
        await db.any('SELECT 1');
        const metrics = await metricsRegistry.metrics();
        expect(metrics).toContain('intelgraph_api_db_pool_active');
    });
});
