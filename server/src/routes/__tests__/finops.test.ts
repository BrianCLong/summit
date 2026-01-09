import express from 'express';
import request from 'supertest';

jest.mock('../../middleware/auth.js', () => ({
  ensureAuthenticated: (req: any, _res: any, next: any) => {
    req.user = { tenantId: 'tenant-1' };
    next();
  },
}), { virtual: true });

jest.mock(
  '../../services/FinOpsRollupService.js',
  () => ({
    finOpsRollupService: {
      getRollups: jest.fn(),
    },
  }),
  { virtual: true },
);

const describeIf =
  process.env.NO_NETWORK_LISTEN === 'true' ? describe.skip : describe;

describeIf('finops router', () => {
  const createApp = () => {
    const finopsRouter = require('../finops').default;
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
    const { finOpsRollupService } = require('../../services/FinOpsRollupService.js');
    (finOpsRollupService.getRollups as jest.Mock).mockResolvedValue(
      mockOverview,
    );

    const res = await request(createApp()).get('/api/finops/rollups?days=7');

    expect(res.status).toBe(200);
    expect(finOpsRollupService.getRollups).toHaveBeenCalledWith('tenant-1', 7);
    expect(res.body.tenantId).toBe('tenant-1');
  });

  it('defaults window to 30 days when unspecified', async () => {
    const { finOpsRollupService } = require('../../services/FinOpsRollupService.js');
    (finOpsRollupService.getRollups as jest.Mock).mockResolvedValue({
      ...mockOverview,
      periodDays: 30,
    });

    const res = await request(createApp()).get('/api/finops/rollups');

    expect(res.status).toBe(200);
    expect(finOpsRollupService.getRollups).toHaveBeenCalledWith('tenant-1', 30);
  });
});
