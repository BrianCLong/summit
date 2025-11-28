import { terminateSlowQuery } from '../query-cost-guard/slow-query-killer';
import { getPostgresPool } from '../../server/src/db/postgres';

jest.mock('../../server/src/db/postgres', () => ({
  getPostgresPool: jest.fn(),
}));

const mockPool = {
  write: jest.fn(),
};

(getPostgresPool as jest.Mock).mockReturnValue(mockPool);

describe('terminateSlowQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should find and terminate a slow query', async () => {
    const slowQuery = { pid: 123, query: 'SELECT pg_sleep(10)' };
    mockPool.write.mockResolvedValueOnce({ rows: [slowQuery] });

    const result = await terminateSlowQuery({ timeoutMs: 5000, queryLabel: 'test-query' });

    expect(result).toBe(true);
    expect(mockPool.write).toHaveBeenCalledWith(expect.stringContaining('pg_stat_activity'), expect.any(Array));
    expect(mockPool.write).toHaveBeenCalledWith('SELECT pg_cancel_backend($1)', [123]);
  });

  it('should do nothing if no slow query is found', async () => {
    mockPool.write.mockResolvedValueOnce({ rows: [] });

    const result = await terminateSlowQuery({ timeoutMs: 5000, queryLabel: 'test-query' });

    expect(result).toBe(false);
    expect(mockPool.write).toHaveBeenCalledTimes(1);
  });

  it('should handle and log errors from the database', async () => {
    const dbError = new Error('Connection error');
    mockPool.write.mockRejectedValue(dbError);

    // We mock the logger to suppress the error in the test output
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const result = await terminateSlowQuery({ timeoutMs: 5000, queryLabel: 'test-query' });

    expect(result).toBe(false);
    expect(mockPool.write).toHaveBeenCalledTimes(1);

    consoleErrorSpy.mockRestore();
  });
});
