"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const tickets_js_1 = require("../repositories/tickets.js");
const postgres_js_1 = require("../postgres.js");
// The pg mock is already set up in jest.setup.cjs
// We can get the mock pool and spy on its query method.
describe('TicketsRepository', () => {
    let mockPool;
    beforeAll(() => {
        process.env.ZERO_FOOTPRINT = 'false';
    });
    beforeEach(() => {
        mockPool = (0, postgres_js_1.getPostgresPool)();
        // In our case, the pool itself has query as a function,
        // but the setup.cjs might have mocked it if we didn't have ZERO_FOOTPRINT.
        // Let's just spy on it if it's not already a mock.
        if (!globals_1.jest.isMockFunction(mockPool.query)) {
            globals_1.jest.spyOn(mockPool, 'query').mockImplementation(async (sql, values) => {
                if (typeof sql === 'string' && sql.includes('INSERT INTO maestro_tickets')) {
                    return { rowCount: values.length / 12, rows: [] };
                }
                return { rowCount: 1, rows: [] };
            });
        }
        globals_1.jest.clearAllMocks();
    });
    it('should upsert tickets in batches (optimized behavior)', async () => {
        const tickets = Array.from({ length: 150 }, (_, i) => ({
            provider: 'github',
            external_id: String(i),
            title: `T${i}`,
            status: 'open',
        }));
        const result = await (0, tickets_js_1.upsertTickets)(tickets);
        expect(result.upserted).toBe(150);
        // 1 for ensureTable (if not already initialized)
        // + 2 for 150 tickets (batch size 100)
        // Total should be at most 3.
        // If already initialized, it should be exactly 2.
        const callCount = mockPool.query.mock.calls.length;
        expect(callCount).toBeLessThanOrEqual(3);
        expect(callCount).toBeGreaterThanOrEqual(2);
        // Verify the SQL contains multi-row VALUES
        const firstBatchCall = mockPool.query.mock.calls.find((call) => call[0].includes('INSERT INTO maestro_tickets') && call[1].length === 100 * 12);
        expect(firstBatchCall).toBeDefined();
        const secondBatchCall = mockPool.query.mock.calls.find((call) => call[0].includes('INSERT INTO maestro_tickets') && call[1].length === 50 * 12);
        expect(secondBatchCall).toBeDefined();
    });
    it('should only call ensureTable once across multiple calls', async () => {
        const tickets = [{ provider: 'github', external_id: 'a', title: 'T', status: 'open' }];
        // First call
        await (0, tickets_js_1.upsertTickets)(tickets);
        const count1 = mockPool.query.mock.calls.length;
        // Second call
        await (0, tickets_js_1.upsertTickets)(tickets);
        const count2 = mockPool.query.mock.calls.length;
        // The second call should not have called ensureTable,
        // so the difference should be exactly 1 (the batch query).
        expect(count2 - count1).toBe(1);
    });
    it('should fall back to individual upserts if batch fails', async () => {
        const tickets = [
            { provider: 'github', external_id: 'err1', title: 'T1', status: 'open' },
            { provider: 'github', external_id: 'err2', title: 'T2', status: 'open' },
        ];
        // Force batch failure
        mockPool.query.mockImplementationOnce(async (sql) => {
            if (typeof sql === 'string' && sql.includes('VALUES ($1,$2')) {
                // This is ensureTable, let it pass
                return { rowCount: 1, rows: [] };
            }
            throw new Error('Batch failure');
        }).mockImplementation(async () => {
            // For fallback individual queries
            return { rowCount: 1, rows: [] };
        });
        const result = await (0, tickets_js_1.upsertTickets)(tickets);
        // Should still have 2 upserted due to fallback
        expect(result.upserted).toBe(2);
        // Verify individual queries were called
        const individualCalls = mockPool.query.mock.calls.filter((call) => call[0].includes('VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, COALESCE($12, NOW()), NOW())'));
        expect(individualCalls.length).toBe(2);
    });
});
