
import { cacheService } from '../src/services/cacheService.js';

// 1. Define mocks
const mockClient = {
  query: jest.fn(),
  release: jest.fn(),
};

// 2. Mock 'pg'
jest.mock('pg', () => {
  return {
    Pool: class MockPool {
      constructor(config: any) {}
      on(event: string, cb: Function) { return this; }
      connect() { return Promise.resolve(mockClient); }
      end() { return Promise.resolve(); }
      get totalCount() { return 0; }
      get idleCount() { return 0; }
      get waitingCount() { return 0; }
    }
  };
});

// 3. Mock cacheService
jest.mock('../src/services/cacheService.js', () => ({
  cacheService: {
    get: jest.fn(),
    set: jest.fn(),
  }
}));

// 4. Import postgres.ts AFTER mocking
import { getPostgresPool, closePostgresPool } from '../src/db/postgres.js';

describe('Postgres Caching Integration', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await closePostgresPool();
    (cacheService.get as jest.Mock).mockResolvedValue(null);
    (cacheService.set as jest.Mock).mockResolvedValue(undefined); // Fix: return Promise

    mockClient.query.mockImplementation(async (arg) => {
      const text = typeof arg === 'string' ? arg : arg.text;
      if (text && (text.startsWith('SET statement_timeout') || text.startsWith('RESET statement_timeout'))) {
        return { rowCount: 0, rows: [] };
      }
      return {
         rows: [],
         rowCount: 0,
         command: 'SELECT',
         oid: 0,
         fields: []
      };
    });
  });

  it('should cache read queries when cache option is provided', async () => {
    const pool = getPostgresPool();

    mockClient.query
      .mockResolvedValueOnce({ rowCount: 0, rows: [] }) // SET
      .mockResolvedValueOnce({ // SELECT
          rows: [{ id: 1, name: 'test' }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: []
      })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] }); // RESET

    const query = 'SELECT * FROM users WHERE id = $1';
    const params = [1];
    const cacheKey = 'user:1';

    await pool.read(query, params, { cache: { key: cacheKey, ttl: 60 } });

    expect(cacheService.get).toHaveBeenCalledWith(cacheKey);

    const calls = mockClient.query.mock.calls;
    const selectCall = calls.find(c => {
        const arg = c[0];
        return typeof arg === 'object' && arg.text && arg.text.includes('SELECT * FROM users');
    });
    expect(selectCall).toBeDefined();

    expect(cacheService.set).toHaveBeenCalledWith(
      cacheKey,
      expect.objectContaining({
        rows: [{ id: 1, name: 'test' }],
        rowCount: 1
      }),
      60
    );
  });

  it('should return cached result and not hit DB', async () => {
    const pool = getPostgresPool();
    const cacheKey = 'user:2';

    (cacheService.get as jest.Mock).mockResolvedValue({
      rows: [{ id: 2, name: 'cached' }],
      rowCount: 1,
      command: 'SELECT',
    });

    const result = await pool.read('SELECT * FROM users', [], { cache: { key: cacheKey } });

    expect(result.rows[0].name).toBe('cached');
    expect(cacheService.get).toHaveBeenCalledWith(cacheKey);
    expect(mockClient.query).not.toHaveBeenCalled();
  });

  it('should NOT cache write queries even if cache option is passed (safety check)', async () => {
    const pool = getPostgresPool();
    const cacheKey = 'write:1';

    mockClient.query
      .mockResolvedValueOnce({ rowCount: 0, rows: [] }) // SET
      .mockResolvedValueOnce({ // INSERT
          rows: [],
          rowCount: 1,
          command: 'INSERT',
          oid: 0,
          fields: []
      })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] }); // RESET

    await pool.write('INSERT INTO users VALUES (1)', [], { cache: { key: cacheKey } });

    expect(cacheService.get).not.toHaveBeenCalled();
    expect(cacheService.set).not.toHaveBeenCalled();
    expect(mockClient.query).toHaveBeenCalledTimes(3);
  });
});
