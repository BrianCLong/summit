import type { QueryConfig } from 'pg';

const originalEnv = { ...process.env };

jest.mock('pg', () => {
  const mockPools: MockPool[] = [];

  class MockClient {
    public readonly query = jest.fn(async (config: any, values?: any[]) => {
      if (typeof config === 'string') {
        if (config.startsWith('SET statement_timeout')) {
          this.pool.lastTimeout = values?.[0];
          return { rows: [], rowCount: 0 };
        }

        if (config === 'RESET statement_timeout') {
          this.pool.lastTimeout = undefined;
          return { rows: [], rowCount: 0 };
        }

        if (config === 'SELECT 1') {
          return { rows: [{ ok: true }], rowCount: 1 };
        }
      }

      if (typeof config === 'object' && config !== null) {
        const queryConfig = config as QueryConfig;
        this.pool.statements.push(queryConfig);
        return this.pool.queryHandler(queryConfig);
      }

      throw new Error('Unsupported query format in mock client');
    });

    public readonly release = jest.fn(() => {
      this.pool.releaseCalls += 1;
    });

    constructor(private readonly pool: MockPool) {}
  }

  class MockPool {
    public readonly connect = jest.fn(async () => {
      this.connectCalls += 1;
      const client = new MockClient(this);
      this.clients.push(client);
      return client;
    });

    public readonly queryHandler = jest.fn(async () => ({ rows: [], rowCount: 0 }));
    public readonly query = jest.fn(async (config: any) => this.queryHandler(config));
    public readonly end = jest.fn(async () => {
      this.closed = true;
    });
    public readonly on = jest.fn();

    public readonly statements: QueryConfig[] = [];
    public readonly clients: MockClient[] = [];
    public connectCalls = 0;
    public releaseCalls = 0;
    public closed = false;
    public lastTimeout?: number;
    public idleCount = 0;
    public totalCount = 0;
    public waitingCount = 0;

    constructor(public readonly config: any) {}
  }

  return {
    Pool: jest.fn((config: any) => {
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

type MockPool = {
  config: any;
  clients: Array<{ query: jest.Mock; release: jest.Mock }>;
  queryHandler: jest.Mock;
  statements: QueryConfig[];
  connectCalls: number;
  releaseCalls: number;
  closed: boolean;
  lastTimeout?: number;
  idleCount: number;
  totalCount: number;
  waitingCount: number;
};

type PgMockModule = {
  __mockPools: MockPool[];
  __reset: () => void;
};

describe('Managed PostgreSQL pool', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    Object.keys(process.env).forEach((key) => {
      delete process.env[key];
    });
    Object.assign(process.env, originalEnv);

    const pgModule = jest.requireMock('pg') as unknown as PgMockModule;
    pgModule.__reset();
  });

  afterAll(() => {
    Object.keys(process.env).forEach((key) => {
      delete process.env[key];
    });
    Object.assign(process.env, originalEnv);
  });

  async function loadModule() {
    const mod = await import('../../src/db/postgres');
    return mod;
  }

  function getMockPools(): MockPool[] {
    const pgModule = jest.requireMock('pg') as unknown as PgMockModule;
    return pgModule.__mockPools;
  }

  it('routes read queries to replicas with enforced statement timeout', async () => {
    process.env.DATABASE_URL = 'postgres://write-primary';
    process.env.DATABASE_READ_REPLICAS = 'postgres://read-1,postgres://read-2';
    process.env.PG_READ_TIMEOUT_MS = '5000';
    process.env.PG_WRITE_TIMEOUT_MS = '30000';

    const { getPostgresPool } = await loadModule();
    const pool = getPostgresPool();
    const [writePool, readPool] = getMockPools();

    readPool.queryHandler.mockResolvedValue({ rows: [{ value: 1 }], rowCount: 1 });

    const result = await pool.query('SELECT * FROM widgets');

    expect(result.rows).toHaveLength(1);
    expect(readPool.connectCalls).toBeGreaterThan(0);
    expect(writePool.connectCalls).toBe(0);

    const client = readPool.clients[0];
    const timeoutCall = client.query.mock.calls.find(([sql]) => typeof sql === 'string' && sql.startsWith('SET statement_timeout'));
    expect(timeoutCall?.[1]?.[0]).toBe(5000);
  });

  it('reuses prepared statement names', async () => {
    process.env.DATABASE_URL = 'postgres://write-primary';
    process.env.DATABASE_READ_REPLICAS = 'postgres://read-1';

    const { getPostgresPool } = await loadModule();
    const pool = getPostgresPool();
    const [, readPool] = getMockPools();

    readPool.queryHandler.mockResolvedValue({ rows: [], rowCount: 0 });

    await pool.query('SELECT * FROM accounts WHERE id = $1', ['a']);
    await pool.query('SELECT * FROM accounts WHERE id = $1', ['b']);

    const executed = readPool.statements.filter((stmt) => stmt.text.includes('FROM accounts'));
    expect(executed).toHaveLength(2);
    expect(executed[0].name).toBeDefined();
    expect(executed[0].name).toBe(executed[1].name);
  });

  it('retries transient failures with exponential backoff', async () => {
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
        (err as any).code = 'ECONNRESET';
        throw err;
      }
      return { rows: [{ ok: true }], rowCount: 1 };
    });

    const result = await pool.query('SELECT 1');
    expect(result.rowCount).toBe(1);
    expect(attempts).toBe(2);
  });

  it('opens the circuit breaker and falls back to the write pool', async () => {
    process.env.DATABASE_URL = 'postgres://write-primary';
    process.env.DATABASE_READ_REPLICAS = 'postgres://read-1';
    process.env.PG_QUERY_MAX_RETRIES = '0';
    process.env.PG_CIRCUIT_BREAKER_FAILURE_THRESHOLD = '2';

    const { getPostgresPool } = await loadModule();
    const pool = getPostgresPool();
    const [writePool, readPool] = getMockPools();

    readPool.queryHandler.mockImplementation(async () => {
      const err = new Error('read failed');
      (err as any).code = 'ECONNRESET';
      throw err;
    });
    writePool.queryHandler.mockResolvedValue({ rows: [{ ok: true }], rowCount: 1 });

    await expect(pool.query('SELECT 1')).rejects.toThrow('read failed');
    await expect(pool.query('SELECT 1')).rejects.toThrow('read failed');
    const fallback = await pool.query('SELECT 1');

    expect(fallback.rowCount).toBe(1);
    expect(writePool.connectCalls).toBeGreaterThan(0);
  });

  it('records slow query insights', async () => {
    process.env.DATABASE_URL = 'postgres://write-primary';
    process.env.DATABASE_READ_REPLICAS = 'postgres://read-1';
    process.env.PG_SLOW_QUERY_THRESHOLD_MS = '0';

    const { getPostgresPool } = await loadModule();
    const pool = getPostgresPool();
    const [, readPool] = getMockPools();

    readPool.queryHandler.mockResolvedValue({ rows: [{ ok: true }], rowCount: 1 });

    await pool.query('SELECT * FROM widgets');

    const insights = pool.slowQueryInsights();
    expect(insights.length).toBeGreaterThan(0);
    expect(insights[0].executions).toBeGreaterThan(0);
  });

  it('provides health check information for pools', async () => {
    process.env.DATABASE_URL = 'postgres://write-primary';
    process.env.DATABASE_READ_REPLICAS = 'postgres://read-1';

    const { getPostgresPool } = await loadModule();
    const pool = getPostgresPool();

    const health = await pool.healthCheck();
    expect(health).toHaveLength(2);
    expect(health.every((entry) => entry.healthy)).toBe(true);
  });

  it('sets up connection leak detection timers', async () => {
    process.env.DATABASE_URL = 'postgres://write-primary';
    process.env.DATABASE_READ_REPLICAS = 'postgres://read-1';
    process.env.PG_CONNECTION_LEAK_THRESHOLD_MS = '1234';
    process.env.PG_RETRY_BASE_DELAY_MS = '0';
    process.env.PG_RETRY_MAX_DELAY_MS = '0';

    const { getPostgresPool } = await loadModule();
    const pool = getPostgresPool();
    const [, readPool] = getMockPools();
    readPool.queryHandler.mockResolvedValue({ rows: [], rowCount: 0 });

    jest.useFakeTimers();
    const timeoutSpy = jest.spyOn(global, 'setTimeout');

    await pool.query('SELECT 1');

    const leakTimeout = timeoutSpy.mock.calls.find(([, timeout]) => timeout === 1234);
    expect(leakTimeout).toBeDefined();

    timeoutSpy.mockRestore();
    jest.useRealTimers();
  });
});

