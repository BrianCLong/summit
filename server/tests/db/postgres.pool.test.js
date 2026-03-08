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
const originalEnv = { ...process.env };
globals_1.jest.mock('pg', () => {
    const mockPools = [];
    const normalizeQuery = (config, values) => {
        if (typeof config === 'string') {
            return { text: config, values };
        }
        if (config && typeof config === 'object') {
            return config;
        }
        throw new Error('Unsupported query format in mock client');
    };
    class MockClient {
        pool;
        query = globals_1.jest.fn(async (config, values) => {
            const queryConfig = normalizeQuery(config, values);
            if (queryConfig.text.startsWith('SET statement_timeout')) {
                this.pool.lastTimeout = queryConfig.values?.[0];
                return { rows: [], rowCount: 0 };
            }
            if (queryConfig.text === 'RESET statement_timeout') {
                this.pool.lastTimeout = undefined;
                return { rows: [], rowCount: 0 };
            }
            this.pool.statements.push(queryConfig);
            return this.pool.queryHandler(queryConfig);
        });
        release = globals_1.jest.fn(() => {
            this.pool.releaseCalls += 1;
        });
        constructor(pool) {
            this.pool = pool;
        }
    }
    class MockPool {
        config;
        connect = globals_1.jest.fn(async () => {
            this.connectCalls += 1;
            const client = new MockClient(this);
            this.clients.push(client);
            return client;
        });
        queryHandler = globals_1.jest.fn(async (config) => {
            if (config.text === 'SELECT 1') {
                return { rows: [{ ok: true }], rowCount: 1 };
            }
            return { rows: [], rowCount: 0 };
        });
        query = globals_1.jest.fn(async (config, values) => {
            const queryConfig = normalizeQuery(config, values);
            if (queryConfig.text.startsWith('SET statement_timeout')) {
                this.lastTimeout = queryConfig.values?.[0];
                return { rows: [], rowCount: 0 };
            }
            if (queryConfig.text === 'RESET statement_timeout') {
                this.lastTimeout = undefined;
                return { rows: [], rowCount: 0 };
            }
            this.statements.push(queryConfig);
            return this.queryHandler(queryConfig);
        });
        end = globals_1.jest.fn(async () => {
            this.closed = true;
        });
        on = globals_1.jest.fn();
        statements = [];
        clients = [];
        connectCalls = 0;
        releaseCalls = 0;
        closed = false;
        lastTimeout;
        idleCount = 0;
        totalCount = 0;
        waitingCount = 0;
        constructor(config) {
            this.config = config;
        }
    }
    return {
        Pool: globals_1.jest.fn((config) => {
            const pool = new MockPool(config);
            mockPools.push(pool);
            return pool;
        }),
        __mockPools: mockPools,
        __reset: () => {
            mockPools.splice(0, mockPools.length);
        },
    };
});
(0, globals_1.describe)('Managed PostgreSQL pool', () => {
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.resetModules();
        globals_1.jest.clearAllMocks();
        Object.keys(process.env).forEach((key) => {
            delete process.env[key];
        });
        Object.assign(process.env, originalEnv);
        process.env.ZERO_FOOTPRINT = 'false';
        const pgModule = globals_1.jest.requireMock('pg');
        pgModule.__reset();
    });
    (0, globals_1.afterAll)(() => {
        Object.keys(process.env).forEach((key) => {
            delete process.env[key];
        });
        Object.assign(process.env, originalEnv);
    });
    async function loadModule() {
        const mod = await Promise.resolve().then(() => __importStar(require('../../src/db/postgres')));
        return mod;
    }
    function getMockPools() {
        const pgModule = globals_1.jest.requireMock('pg');
        return pgModule.__mockPools;
    }
    (0, globals_1.it)('routes read queries to the read pool', async () => {
        process.env.DATABASE_URL = 'postgres://write-primary';
        process.env.DATABASE_READ_REPLICAS = 'postgres://read-1,postgres://read-2';
        process.env.PG_READ_TIMEOUT_MS = '5000';
        process.env.PG_WRITE_TIMEOUT_MS = '30000';
        const { getPostgresPool } = await loadModule();
        const pool = getPostgresPool();
        const [writePool, readPool] = getMockPools();
        readPool.queryHandler.mockImplementation(async () => ({
            rows: [{ value: 1 }],
            rowCount: 1,
        }));
        const result = await pool.query('SELECT * FROM widgets');
        (0, globals_1.expect)(result.rows).toHaveLength(1);
        (0, globals_1.expect)(readPool.connectCalls).toBeGreaterThan(0);
        (0, globals_1.expect)(writePool.connectCalls).toBe(0);
    });
    (0, globals_1.it)('reuses prepared statement names', async () => {
        process.env.DATABASE_URL = 'postgres://write-primary';
        process.env.DATABASE_READ_REPLICAS = 'postgres://read-1';
        const { getPostgresPool } = await loadModule();
        const pool = getPostgresPool();
        const [, readPool] = getMockPools();
        readPool.queryHandler.mockImplementation(async () => ({ rows: [], rowCount: 0 }));
        await pool.query('SELECT * FROM accounts WHERE id = $1', ['a']);
        await pool.query('SELECT * FROM accounts WHERE id = $1', ['b']);
        const executed = readPool.statements.filter((stmt) => stmt.text.includes('FROM accounts'));
        (0, globals_1.expect)(executed).toHaveLength(2);
        (0, globals_1.expect)(executed[0].name).toBeDefined();
        (0, globals_1.expect)(executed[0].name).toBe(executed[1].name);
    });
    (0, globals_1.it)('retries transient failures with exponential backoff', async () => {
        process.env.DATABASE_URL = 'postgres://write-primary';
        process.env.DATABASE_READ_REPLICAS = 'postgres://read-1';
        process.env.PG_QUERY_MAX_RETRIES = '2';
        process.env.PG_RETRY_BASE_DELAY_MS = '1';
        process.env.PG_RETRY_MAX_DELAY_MS = '2';
        const { getPostgresPool } = await loadModule();
        const pool = getPostgresPool();
        const [, readPool] = getMockPools();
        let attempts = 0;
        readPool.queryHandler.mockImplementation(async () => {
            attempts += 1;
            if (attempts < 2) {
                const err = new Error('reset');
                err.code = 'ECONNRESET';
                throw err;
            }
            return { rows: [{ ok: true }], rowCount: 1 };
        });
        const result = await pool.query('SELECT 1');
        (0, globals_1.expect)(result.rowCount).toBe(1);
        (0, globals_1.expect)(attempts).toBe(2);
    });
    (0, globals_1.it)('falls back to the write pool after read failures', async () => {
        process.env.DATABASE_URL = 'postgres://write-primary';
        process.env.DATABASE_READ_REPLICAS = 'postgres://read-1';
        process.env.PG_QUERY_MAX_RETRIES = '0';
        process.env.PG_CIRCUIT_BREAKER_FAILURE_THRESHOLD = '2';
        const { getPostgresPool } = await loadModule();
        const pool = getPostgresPool();
        const [writePool, readPool] = getMockPools();
        readPool.queryHandler.mockImplementation(async () => {
            const err = new Error('read failed');
            err.code = 'ECONNRESET';
            throw err;
        });
        writePool.queryHandler.mockImplementation(async () => ({
            rows: [{ ok: true }],
            rowCount: 1,
        }));
        const fallback = await pool.query('SELECT 1');
        (0, globals_1.expect)(fallback.rowCount).toBe(1);
        (0, globals_1.expect)(readPool.connectCalls).toBeGreaterThan(0);
        (0, globals_1.expect)(writePool.connectCalls).toBeGreaterThan(0);
    });
    (0, globals_1.it)('records slow query insights', async () => {
        process.env.DATABASE_URL = 'postgres://write-primary';
        process.env.DATABASE_READ_REPLICAS = 'postgres://read-1';
        process.env.SLOW_QUERY_MS = '0';
        const { getPostgresPool } = await loadModule();
        const pool = getPostgresPool();
        const [, readPool] = getMockPools();
        readPool.queryHandler.mockImplementation(async () => ({
            rows: [{ ok: true }],
            rowCount: 1,
        }));
        await pool.query('SELECT * FROM widgets');
        const insights = pool.slowQueryInsights();
        (0, globals_1.expect)(insights.length).toBeGreaterThan(0);
        (0, globals_1.expect)(insights[0].executions).toBeGreaterThan(0);
    });
    (0, globals_1.it)('provides health check information for pools', async () => {
        process.env.DATABASE_URL = 'postgres://write-primary';
        process.env.DATABASE_READ_REPLICAS = 'postgres://read-1';
        const { getPostgresPool } = await loadModule();
        const pool = getPostgresPool();
        const health = await pool.healthCheck();
        (0, globals_1.expect)(health).toHaveLength(2);
        (0, globals_1.expect)(health.every((entry) => entry.healthy)).toBe(true);
    });
    (0, globals_1.it)('sets up connection leak detection timers', async () => {
        process.env.DATABASE_URL = 'postgres://write-primary';
        process.env.DATABASE_READ_REPLICAS = 'postgres://read-1';
        process.env.PG_CONNECTION_LEAK_THRESHOLD_MS = '1234';
        process.env.PG_RETRY_BASE_DELAY_MS = '0';
        process.env.PG_RETRY_MAX_DELAY_MS = '0';
        const { getPostgresPool } = await loadModule();
        const pool = getPostgresPool();
        const [, readPool] = getMockPools();
        readPool.queryHandler.mockImplementation(async () => ({ rows: [], rowCount: 0 }));
        globals_1.jest.useFakeTimers();
        const timeoutSpy = globals_1.jest.spyOn(global, 'setTimeout');
        await pool.healthCheck();
        const leakTimeout = timeoutSpy.mock.calls.find(([, timeout]) => timeout === 60000);
        (0, globals_1.expect)(leakTimeout).toBeDefined();
        timeoutSpy.mockRestore();
        globals_1.jest.useRealTimers();
    });
});
