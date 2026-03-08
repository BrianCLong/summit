"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const incremental_loader_1 = require("./incremental-loader");
const pg_1 = require("pg");
const queryMock = vitest_1.vi.fn();
// Mock pg
vitest_1.vi.mock('pg', () => {
    return {
        Pool: class {
            query = queryMock;
        },
    };
});
(0, vitest_1.describe)('IncrementalLoader Security', () => {
    let loader;
    let pool;
    (0, vitest_1.beforeEach)(() => {
        // Reset the global mock
        queryMock.mockReset();
        // We can instantiate Pool, but it will use our mock class
        pool = new pg_1.Pool();
        loader = new incremental_loader_1.IncrementalLoader(pool);
    });
    (0, vitest_1.it)('should use parameterized queries for rowExists to prevent SQL injection', async () => {
        const maliciousValue = "1'; DROP TABLE users; --";
        // 1. fetch changes
        queryMock.mockResolvedValueOnce({
            rows: [{ id: maliciousValue, name: 'Test' }],
        });
        // 2. rowExists
        queryMock.mockResolvedValueOnce({
            rows: [],
        });
        // 3. insertRow
        queryMock.mockResolvedValueOnce({
            rows: [],
        });
        await loader.loadIncremental('target_table', 'source_table', ['id'], {
            timestampColumn: 'updated_at',
        });
        // The second call is rowExists
        const rowExistsCall = queryMock.mock.calls[1];
        (0, vitest_1.expect)(rowExistsCall).toBeDefined();
        const [sql, params] = rowExistsCall;
        // Expectation: SQL should NOT contain the value, but use placeholder
        (0, vitest_1.expect)(sql).not.toContain(maliciousValue);
        (0, vitest_1.expect)(sql).toContain('$1');
        (0, vitest_1.expect)(params).toEqual([maliciousValue]);
    });
    (0, vitest_1.it)('should use parameterized queries for updateRow', async () => {
        const maliciousValue = "1'; DROP TABLE users; --";
        // 1. fetch changes
        queryMock.mockResolvedValueOnce({
            rows: [{ id: '1', name: maliciousValue }],
        });
        // 2. rowExists returns true (so we update)
        queryMock.mockResolvedValueOnce({
            rows: [{ 1: 1 }],
        });
        // 3. updateRow
        queryMock.mockResolvedValueOnce({
            rows: [],
        });
        await loader.loadIncremental('target_table', 'source_table', ['id'], {
            timestampColumn: 'updated_at',
        });
        // The third call is updateRow
        const updateCall = queryMock.mock.calls[2];
        (0, vitest_1.expect)(updateCall).toBeDefined();
        const [sql, params] = updateCall;
        (0, vitest_1.expect)(sql).not.toContain(maliciousValue);
        (0, vitest_1.expect)(params).toContain(maliciousValue);
    });
});
