import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const mockPool = {
  query: jest.fn() as any,
};

// Use unstable_mockModule for ESM mocking
jest.unstable_mockModule('../../postgres.js', () => ({
  getPostgresPool: () => mockPool,
}));

// Import after mocking
const { upsertTickets } = await import('../tickets.js');

describe('Tickets Repository - Optimized upsertTickets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPool.query.mockImplementation(async (sql: string, values?: any[]) => {
      if (sql.includes('CREATE TABLE')) return { rowCount: 0, rows: [] };
      if (sql.includes('INSERT INTO')) {
          if (values && values.length > 12) return { rowCount: values.length / 12, rows: [] };
          return { rowCount: 1, rows: [] };
      }
      return { rowCount: 1, rows: [] };
    });
  });

  it('should handle empty array', async () => {
    const result = await upsertTickets([]);
    expect(result.upserted).toBe(0);
  });

  it('should batch inserts in chunks of 100', async () => {
    const tickets: any[] = Array(150).fill(null).map((_, i) => ({
      provider: 'github',
      external_id: `ext-${i}`,
      title: `Ticket ${i}`,
      status: 'open',
    }));

    const result = await upsertTickets(tickets);

    expect(result.upserted).toBe(150);

    // Find batch insert calls
    const batchCalls = mockPool.query.mock.calls.filter((call: any) =>
        call[0].includes('INSERT INTO') && call[0].includes('VALUES') && call[0].includes('), ($')
    );

    expect(batchCalls).toHaveLength(2);

    // First chunk (100 items)
    expect(batchCalls[0][1]).toHaveLength(1200);
    expect(batchCalls[0][0]).toContain('$1200');

    // Second chunk (50 items)
    expect(batchCalls[1][1]).toHaveLength(600);
    expect(batchCalls[1][0]).toContain('$600');
  });

  it('should fall back to individual inserts if batch fails', async () => {
    const tickets: any[] = [
      { provider: 'github', external_id: '1', title: 'T1', status: 'open' },
      { provider: 'github', external_id: '2', title: 'T2', status: 'open' },
    ];

    mockPool.query.mockImplementation(async (sql: string, values?: any[]) => {
      if (sql.includes('CREATE TABLE')) return { rowCount: 0, rows: [] };
      if (sql.includes('VALUES') && sql.includes('), ($')) {
          // This is the batch insert
          throw new Error('Batch failed');
      }
      if (sql.includes('INSERT INTO')) {
          // Individual insert
          return { rowCount: 1, rows: [] };
      }
      return { rowCount: 0 };
    });

    const result = await upsertTickets(tickets);

    expect(result.upserted).toBe(2);

    // Check for individual insert calls (they don't have multiple value groups)
    const individualCalls = mockPool.query.mock.calls.filter((call: any) =>
        call[0].includes('INSERT INTO') && !call[0].includes('), ($') && !call[0].includes('CREATE TABLE')
    );
    // At least 2 individual calls (one for each ticket)
    expect(individualCalls.length).toBeGreaterThanOrEqual(2);
  });
});
