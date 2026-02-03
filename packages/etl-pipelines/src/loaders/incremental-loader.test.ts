import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IncrementalLoader } from './incremental-loader';
import { Pool } from 'pg';

const queryMock = vi.fn();

// Mock pg
vi.mock('pg', () => {
  return {
    Pool: class {
      query = queryMock;
    },
  };
});

describe('IncrementalLoader Security', () => {
  let loader: IncrementalLoader;
  let pool: Pool;

  beforeEach(() => {
    // Reset the global mock
    queryMock.mockReset();

    // We can instantiate Pool, but it will use our mock class
    pool = new Pool();
    loader = new IncrementalLoader(pool);
  });

  it('should use parameterized queries for rowExists to prevent SQL injection', async () => {
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
    expect(rowExistsCall).toBeDefined();
    const [sql, params] = rowExistsCall;

    // Expectation: SQL should NOT contain the value, but use placeholder
    expect(sql).not.toContain(maliciousValue);
    expect(sql).toContain('$1');
    expect(params).toEqual([maliciousValue]);
  });

  it('should use parameterized queries for updateRow', async () => {
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
    expect(updateCall).toBeDefined();
    const [sql, params] = updateCall;

    expect(sql).not.toContain(maliciousValue);
    expect(params).toContain(maliciousValue);
  });
});
