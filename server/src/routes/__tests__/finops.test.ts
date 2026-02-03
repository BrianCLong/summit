import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import express from 'express';
import request from 'supertest';

// Mock functions declared before mocks
const mockGetRollups = jest.fn();

// ESM-compatible mocking using unstable_mockModule
jest.unstable_mockModule('../../middleware/auth.js', () => ({
  ensureAuthenticated: (req: any, _res: any, next: any) => {
    req.user = { tenantId: 'tenant-1' };
    next();
  },
}));

jest.unstable_mockModule('../../services/FinOpsRollupService.js', () => ({
  finOpsRollupService: {
    getRollups: mockGetRollups,
  },
}));

// Dynamic imports AFTER mocks are set up
const finopsRouter = (await import('../finops.js')).default;
const { finOpsRollupService } = await import('../../services/FinOpsRollupService.js');

const describeIf =
  process.env.NO_NETWORK_LISTEN === 'true' ? describe.skip : describe;

describeIf('finops router', () => {
  const createApp = () => {
    const app = express();
    app.use(express.json());
    app.use('/api/finops', finopsRouter);
    return app;
  };

  const mockOverview = {
    tenantId: 'tenant-1',
    periodDays: 7,
    totals: {
      totalCostUsd: 10,
      computeCostUsd: 5,
      storageCostUsd: 3,
      egressCostUsd: 1,
      thirdPartyCostUsd: 1,
    },
    buckets: [],
    unitMetrics: {
      costPerComputeUnit: 0.1,
      costPerGbHour: 0.01,
      costPerEgressGb: 0.02,
      costPerThirdPartyRequest: 0.001,
    },
    trend: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns rollup overview for authenticated tenant', async () => {
    mockGetRollups.mockResolvedValue(mockOverview);

    const res = await request(createApp()).get('/api/finops/rollups?days=7');

    expect(res.status).toBe(200);
    expect(finOpsRollupService.getRollups).toHaveBeenCalledWith('tenant-1', 7);
    expect(res.body.tenantId).toBe('tenant-1');
  });

  it('defaults window to 30 days when unspecified', async () => {
    mockGetRollups.mockResolvedValue({
      ...mockOverview,
      periodDays: 30,
    });

    const res = await request(createApp()).get('/api/finops/rollups');

    expect(res.status).toBe(200);
    expect(finOpsRollupService.getRollups).toHaveBeenCalledWith('tenant-1', 30);
  });
});
