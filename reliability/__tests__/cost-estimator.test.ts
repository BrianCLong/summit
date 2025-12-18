import { estimateQueryCost } from '../query-cost-guard/cost-estimator';
import { getPostgresPool } from '../../server/src/db/postgres';

jest.mock('../../server/src/db/postgres', () => ({
  getPostgresPool: jest.fn(),
}));

const mockPool = {
  read: jest.fn(),
};

(getPostgresPool as jest.Mock).mockReturnValue(mockPool);

describe('estimateQueryCost', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return the total and startup cost from a valid query plan', async () => {
    const mockPlan = {
      'QUERY PLAN': [
        {
          Plan: {
            'Node Type': 'Aggregate',
            'Strategy': 'Hashed',
            'Partial Mode': 'Simple',
            'Parallel Aware': false,
            'Startup Cost': 250.00,
            'Total Cost': 251.00,
            'Plan Rows': 100,
            'Plan Width': 8,
          },
        },
      ],
    };
    mockPool.read.mockResolvedValue({ rows: [mockPlan] });

    const cost = await estimateQueryCost('SELECT COUNT(*) FROM users');

    expect(cost.totalCost).toBe(251.00);
    expect(cost.startupCost).toBe(250.00);
    expect(mockPool.read).toHaveBeenCalledWith('EXPLAIN (FORMAT JSON) SELECT COUNT(*) FROM users', []);
  });

  it('should throw an error if the query plan is missing', async () => {
    mockPool.read.mockResolvedValue({ rows: [] });
    await expect(estimateQueryCost('SELECT 1')).rejects.toThrow('Could not retrieve query plan.');
  });

  it('should throw an error if the query plan format is invalid', async () => {
    const invalidPlan = { 'QUERY PLAN': [{ Plan: {} }] };
    mockPool.read.mockResolvedValue({ rows: [invalidPlan] });
    await expect(estimateQueryCost('SELECT 1')).rejects.toThrow('Invalid query plan format.');
  });

  it('should re-throw errors from the database', async () => {
    const dbError = new Error('Syntax error');
    mockPool.read.mockRejectedValue(dbError);
    await expect(estimateQueryCost('SELECT INVALID')).rejects.toThrow('Syntax error');
  });
});
