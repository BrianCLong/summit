"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const pgvector_sync_1 = require("../src/lib/pgvector-sync");
// Mock pg
globals_1.jest.mock('pg', () => {
    const mClient = {
        query: globals_1.jest.fn((...args) => Promise.resolve({ rows: [], rowCount: 0 })),
        release: globals_1.jest.fn(),
    };
    const mPool = {
        connect: globals_1.jest.fn(() => Promise.resolve(mClient)),
        query: globals_1.jest.fn((...args) => Promise.resolve({ rows: [], rowCount: 0 })),
        end: globals_1.jest.fn(),
        on: globals_1.jest.fn(),
    };
    return {
        default: {
            Pool: globals_1.jest.fn(() => mPool),
        },
        Pool: globals_1.jest.fn(() => mPool),
    };
});
(0, globals_1.describe)('PgVectorSync Security', () => {
    (0, globals_1.it)('should reject invalid table names to prevent SQL injection', async () => {
        const sync = new pgvector_sync_1.PgVectorSync({
            host: 'localhost',
            port: 5432,
            database: 'test',
            user: 'test',
            password: 'password',
            ssl: false
        });
        // malicious table name
        const maliciousOptions = { tableName: 'users; DROP TABLE users; --' };
        await (0, globals_1.expect)(sync.ensureTable(maliciousOptions))
            .rejects
            .toThrow(/Invalid identifier/);
    });
    (0, globals_1.it)('should reject invalid column names', async () => {
        const sync = new pgvector_sync_1.PgVectorSync({
            host: 'localhost',
            port: 5432,
            database: 'test',
            user: 'test',
            password: 'password',
            ssl: false
        });
        await (0, globals_1.expect)(sync.ensureTable({ idColumn: 'id; --' }))
            .rejects
            .toThrow(/Invalid identifier/);
    });
});
