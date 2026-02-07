import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import type { Ticket } from '../tickets.js';

// Mock the postgres module
const mockQuery = jest.fn();
const mockPool = {
  query: mockQuery,
};

// Use unstable_mockModule for ESM support
jest.unstable_mockModule('../../postgres.js', () => ({
  getPostgresPool: () => mockPool,
}));

// Dynamic import of the module under test
const { upsertTickets } = await import('../tickets.js');

describe('upsertTickets', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValue({ rows: [] });
  });

  it('should upsert tickets in batches', async () => {
    const tickets: Ticket[] = Array.from({ length: 55 }, (_, i) => ({
      provider: 'github',
      external_id: `id-${i}`,
      title: `Ticket ${i}`,
      status: 'open',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    await upsertTickets(tickets);

    // Expect 3 calls:
    // 1. ensureTable
    // 2. Batch 1 (50 items)
    // 3. Batch 2 (5 items)
    expect(mockQuery).toHaveBeenCalledTimes(3);

    const ensureTableCall = mockQuery.mock.calls[0];
    expect(ensureTableCall[0]).toContain('CREATE TABLE IF NOT EXISTS maestro_tickets');

    const firstBatchCall = mockQuery.mock.calls[1];
    const firstBatchSql = firstBatchCall[0] as string;
    const firstBatchParams = firstBatchCall[1] as any[];

    // 50 items * 12 params = 600 params
    expect(firstBatchParams.length).toBe(50 * 12);
    expect(firstBatchSql).toContain('VALUES ($1,$2,');

    const secondBatchCall = mockQuery.mock.calls[2];
    const secondBatchParams = secondBatchCall[1] as any[];
    // 5 items * 12 params = 60 params
    expect(secondBatchParams.length).toBe(5 * 12);
  });
});
