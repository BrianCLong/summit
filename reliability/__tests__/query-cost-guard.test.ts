import { QueryCostGuard } from '../query-cost-guard';
import { estimateQueryCost } from '../query-cost-guard/cost-estimator';
import { budgetManager } from '../query-cost-guard/budget-manager';
import { terminateSlowQuery } from '../query-cost-guard/slow-query-killer';
import { getPostgresPool } from '../../server/src/db/postgres';
import * as config from '../config';

// Mock dependencies
jest.mock('../query-cost-guard/cost-estimator');
jest.mock('../query-cost-guard/slow-query-killer');
jest.mock('../../server/src/db/postgres', () => ({
  getPostgresPool: jest.fn(),
}));
jest.mock('../config');

const mockPool = {
  query: jest.fn(),
};
(getPostgresPool as jest.Mock).mockReturnValue(mockPool);

const mockEstimateQueryCost = estimateQueryCost as jest.Mock;
const mockTerminateSlowQuery = terminateSlowQuery as jest.Mock;
const mockIsOpsGuardV1Enabled = jest.spyOn(config, 'isOpsGuardV1Enabled');

describe('QueryCostGuard Integration', () => {
  let guard: QueryCostGuard;
  const testConfig = {
    tenantId: 'test-tenant',
    queryLabel: 'test-query',
    maxCost: 1000,
    timeoutMs: 5000,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    budgetManager._clearForTesting();
    guard = new QueryCostGuard();
  });

  describe('Feature Flag Enabled', () => {
    beforeEach(() => {
      mockIsOpsGuardV1Enabled.mockReturnValue(true);
    });

    it('should execute a query if cost and budget are within limits', async () => {
      mockEstimateQueryCost.mockResolvedValue({ totalCost: 500 });
      mockPool.query.mockResolvedValue({ rows: [{ result: 'ok' }] });

      const result = await guard.execute('SELECT 1', [], testConfig);

      expect(result).toEqual({ rows: [{ result: 'ok' }] });
      expect(mockEstimateQueryCost).toHaveBeenCalledWith('SELECT 1', []);
      expect(mockPool.query).toHaveBeenCalledWith('SELECT 1', [], { label: 'test-query' });
      expect(budgetManager.getBudget('test-tenant').usage).toBe(500);
    });

    it('should throw an error if the estimated cost exceeds the max cost', async () => {
      mockEstimateQueryCost.mockResolvedValue({ totalCost: 1500 });

      await expect(guard.execute('SELECT 1', [], testConfig)).rejects.toThrow(
        'Query cost estimate (1500) exceeds the maximum of 1000.'
      );
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    it('should throw an error if the budget is exceeded', async () => {
      budgetManager.setBudget('test-tenant', 1000);
      budgetManager.recordCost('test-tenant', 800);
      mockEstimateQueryCost.mockResolvedValue({ totalCost: 300 });

      await expect(guard.execute('SELECT 1', [], testConfig)).rejects.toThrow(
        'Query budget exceeded.'
      );
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    it('should not call the slow query killer if the query finishes in time', async () => {
        jest.useFakeTimers();
        mockEstimateQueryCost.mockResolvedValue({ totalCost: 100 });
        mockPool.query.mockResolvedValue({ rows: [] });

        await guard.execute('SELECT 1', [], testConfig);

        jest.runAllTimers();

        expect(mockTerminateSlowQuery).not.toHaveBeenCalled();
        jest.useRealTimers();
    });
  });

  describe('Feature Flag Disabled', () => {
    it('should execute the query directly without any checks', async () => {
      mockIsOpsGuardV1Enabled.mockReturnValue(false);
      mockPool.query.mockResolvedValue({ rows: [{ result: 'direct' }] });

      const result = await guard.execute('SELECT 1', [], testConfig);

      expect(result).toEqual({ rows: [{ result: 'direct' }] });
      expect(mockEstimateQueryCost).not.toHaveBeenCalled();
      expect(mockPool.query).toHaveBeenCalledWith('SELECT 1', [], { label: 'test-query' });
      expect(budgetManager.getBudget('test-tenant').usage).toBe(0);
    });
  });
});
