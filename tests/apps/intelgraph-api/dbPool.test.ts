import { jest } from '@jest/globals';

const capturedConfigs: any[] = [];
const mockQuery = jest.fn();
const mockRelease = jest.fn();
const mockPoolConnect = jest.fn();
const mockPoolEnd = jest.fn();

jest.mock('pg', () => {
  const Pool = jest.fn((config) => {
    capturedConfigs.push(config);
    return {
      connect: mockPoolConnect,
      end: mockPoolEnd,
      totalCount: 0,
      idleCount: 0,
      waitingCount: 0,
      on: jest.fn(),
    };
  });

  return { Pool };
});

describe('intelgraph-api db pool', () => {
  beforeEach(() => {
    jest.resetModules();
    capturedConfigs.length = 0;
    mockQuery.mockReset();
    mockRelease.mockReset();
    mockPoolConnect.mockReset();
    mockPoolEnd.mockReset();
    mockPoolEnd.mockResolvedValue(undefined);
    mockPoolConnect.mockResolvedValue({
      query: mockQuery,
      release: mockRelease,
    } as any);
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 } as any);
    process.env.DB_POOL_TUNING = '1';
    process.env.PG_CONNECTION = 'postgres://localhost/testdb';
    delete process.env.DB_POOL_MAX;
  });

  afterEach(async () => {
    const { closeDbPool } = await import(
      '../../../apps/intelgraph-api/src/lib/dbPool.js'
    );
    await closeDbPool();
  });

  it('applies tuning options when DB_POOL_TUNING is enabled', async () => {
    process.env.DB_POOL_MAX = '250';
    const { createDbClient } = await import(
      '../../../apps/intelgraph-api/src/lib/dbPool.js'
    );

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
    const { createDbClient } = await import(
      '../../../apps/intelgraph-api/src/lib/dbPool.js'
    );
    const db = createDbClient();

    await db.any('SELECT * FROM widgets WHERE id = $1', ['widget-1']);

    expect(mockQuery).toHaveBeenCalledWith('BEGIN');
    expect(
      mockQuery.mock.calls.find(([arg]) => arg === 'SET TRANSACTION READ ONLY'),
    ).toBeTruthy();
    const preparedCall = mockQuery.mock.calls.find(
      ([arg]) =>
        typeof arg === 'object' &&
        (arg as any).name &&
        (arg as any).text?.includes('SELECT * FROM widgets'),
    );
    expect(preparedCall?.[0]).toMatchObject({
      name: expect.stringMatching(/^stmt_/),
    });
    expect(mockQuery).toHaveBeenCalledWith('COMMIT');
  });

  it('emits pool metrics for scraping', async () => {
    const { metricsRegistry, createDbClient } = await import(
      '../../../apps/intelgraph-api/src/lib/dbPool.js'
    );
    const db = createDbClient();

    await db.any('SELECT 1');

    const metrics = await metricsRegistry.metrics();
    expect(metrics).toContain('intelgraph_api_db_pool_active');
  });
});
