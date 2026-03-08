
import { jest } from '@jest/globals';
import { upsertTickets } from '../repositories/tickets.js';
import { getPostgresPool } from '../postgres.js';

// The pg mock is already set up in jest.setup.cjs
// We can get the mock pool and spy on its query method.

describe('TicketsRepository', () => {
  let mockPool: any;

  beforeAll(() => {
    process.env.ZERO_FOOTPRINT = 'false';
  });

  beforeEach(() => {
    mockPool = getPostgresPool();
    // In our case, the pool itself has query as a function,
    // but the setup.cjs might have mocked it if we didn't have ZERO_FOOTPRINT.
    // Let's just spy on it if it's not already a mock.
    if (!jest.isMockFunction(mockPool.query)) {
      jest.spyOn(mockPool, 'query').mockImplementation(async (sql: any, values: any) => {
        if (typeof sql === 'string' && sql.includes('INSERT INTO maestro_tickets')) {
          return { rowCount: values.length / 12, rows: [] } as any;
        }
        return { rowCount: 1, rows: [] } as any;
      });
    }
    jest.clearAllMocks();
  });

  it('should upsert tickets in batches (optimized behavior)', async () => {
    const tickets = Array.from({ length: 150 }, (_, i) => ({
      provider: 'github' as const,
      external_id: String(i),
      title: `T${i}`,
      status: 'open',
    }));

    const result = await upsertTickets(tickets);

    expect(result.upserted).toBe(150);

    // 1 for ensureTable (if not already initialized)
    // + 2 for 150 tickets (batch size 100)
    // Total should be at most 3.
    // If already initialized, it should be exactly 2.
    const callCount = (mockPool.query as any).mock.calls.length;
    expect(callCount).toBeLessThanOrEqual(3);
    expect(callCount).toBeGreaterThanOrEqual(2);

    // Verify the SQL contains multi-row VALUES
    const firstBatchCall = (mockPool.query as any).mock.calls.find((call: any) =>
      call[0].includes('INSERT INTO maestro_tickets') && call[1].length === 100 * 12
    );
    expect(firstBatchCall).toBeDefined();

    const secondBatchCall = (mockPool.query as any).mock.calls.find((call: any) =>
      call[0].includes('INSERT INTO maestro_tickets') && call[1].length === 50 * 12
    );
    expect(secondBatchCall).toBeDefined();
  });

  it('should only call ensureTable once across multiple calls', async () => {
    const tickets = [{ provider: 'github' as const, external_id: 'a', title: 'T', status: 'open' }];

    // First call
    await upsertTickets(tickets);
    const count1 = (mockPool.query as any).mock.calls.length;

    // Second call
    await upsertTickets(tickets);
    const count2 = (mockPool.query as any).mock.calls.length;

    // The second call should not have called ensureTable,
    // so the difference should be exactly 1 (the batch query).
    expect(count2 - count1).toBe(1);
  });

  it('should fall back to individual upserts if batch fails', async () => {
    const tickets = [
      { provider: 'github' as const, external_id: 'err1', title: 'T1', status: 'open' },
      { provider: 'github' as const, external_id: 'err2', title: 'T2', status: 'open' },
    ];

    // Force batch failure
    (mockPool.query as any).mockImplementationOnce(async (sql: any) => {
      if (typeof sql === 'string' && sql.includes('VALUES ($1,$2')) {
         // This is ensureTable, let it pass
         return { rowCount: 1, rows: [] };
      }
      throw new Error('Batch failure');
    }).mockImplementation(async () => {
      // For fallback individual queries
      return { rowCount: 1, rows: [] };
    });

    const result = await upsertTickets(tickets);

    // Should still have 2 upserted due to fallback
    expect(result.upserted).toBe(2);

    // Verify individual queries were called
    const individualCalls = (mockPool.query as any).mock.calls.filter((call: any) =>
      call[0].includes('VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, COALESCE($12, NOW()), NOW())')
    );
    expect(individualCalls.length).toBe(2);
  });
});
