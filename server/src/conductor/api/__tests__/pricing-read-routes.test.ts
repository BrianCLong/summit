import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import express from 'express';
import request from 'supertest';
let pricingReadRoutes: typeof import('../pricing-read-routes.js').pricingReadRoutes;
let mockedListPools: jest.MockedFunction<typeof import('../../scheduling/pools.js').listPools>;
let mockedCurrentPricing: jest.MockedFunction<typeof import('../../scheduling/pools.js').currentPricing>;

jest.unstable_mockModule(new URL('../../auth/rbac-middleware.ts', import.meta.url).pathname, () => ({
  requirePermission: () => (_req: any, _res: any, next: any) => next(),
}));

jest.unstable_mockModule(new URL('../../scheduling/pools.ts', import.meta.url).pathname, () => ({
  listPools: jest.fn(),
  currentPricing: jest.fn(),
}));

jest.unstable_mockModule(new URL('../../../config/logger.ts', import.meta.url).pathname, () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use(pricingReadRoutes);
  return app;
};

if (!process.env.NO_NETWORK_LISTEN) {
  process.env.NO_NETWORK_LISTEN = 'true';
}
const describeIf = process.env.NO_NETWORK_LISTEN === 'true' ? describe.skip : describe;

describeIf('pricingReadRoutes', () => {
  beforeAll(async () => {
    ({ pricingReadRoutes } = await import('../pricing-read-routes.js'));
    ({ listPools: mockedListPools, currentPricing: mockedCurrentPricing } = await import(
      new URL('../../scheduling/pools.ts', import.meta.url).pathname,
    ));
  });

  beforeEach(() => {
    mockedListPools.mockReset();
    mockedCurrentPricing.mockReset();
  });

  it('returns pools via /pools', async () => {
    const pools = [
      { id: 'pool-a', region: 'us-east-1', labels: ['gpu'], capacity: 10 },
    ];
    mockedListPools.mockResolvedValue(pools as any);
    const res = await request(buildApp()).get('/pools');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.pools).toEqual(pools);
  });

  it('returns current pricing', async () => {
    const pricing = {
      'pool-a': {
        pool_id: 'pool-a',
        cpu_sec_usd: 0.000012,
        gb_sec_usd: 0.000009,
        egress_gb_usd: 0.09,
      },
    };
    mockedCurrentPricing.mockResolvedValue(pricing as any);
    const res = await request(buildApp()).get('/pricing/current');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.pricing).toEqual(pricing);
  });

  it('simulates selection and explains eligibility', async () => {
    mockedListPools.mockResolvedValue([
      { id: 'us-east-1-a', region: 'us-east-1', labels: [], capacity: 5 },
      { id: 'us-east-1-b', region: 'us-east-1', labels: [], capacity: 5 },
      { id: 'eu-west-1-a', region: 'eu-west-1', labels: [], capacity: 5 },
    ] as any);
    mockedCurrentPricing.mockResolvedValue({
      'us-east-1-a': {
        pool_id: 'us-east-1-a',
        cpu_sec_usd: 0.00001,
        gb_sec_usd: 0.00002,
        egress_gb_usd: 0.09,
      },
      'eu-west-1-a': {
        pool_id: 'eu-west-1-a',
        cpu_sec_usd: 0.000015,
        gb_sec_usd: 0.000025,
        egress_gb_usd: 0.1,
      },
    } as any);

    const res = await request(buildApp())
      .post('/pricing/simulate-selection')
      .send({
        est: { cpuSec: 60, gbSec: 1, egressGb: 0.02 },
        residency: 'us-east-1',
        tenantId: 't-123',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const considered = res.body.data.considered;
    const usEastA = considered.find((c: any) => c.id === 'us-east-1-a');
    const usEastB = considered.find((c: any) => c.id === 'us-east-1-b');
    const euWest = considered.find((c: any) => c.id === 'eu-west-1-a');

    expect(usEastA.reason).toBe('ok');
    expect(usEastB.reason).toBe('missing_pricing');
    expect(euWest.reason).toBe('residency_mismatch');

    expect(res.body.data.chosen).toEqual({
      id: 'us-east-1-a',
      price: usEastA.price,
    });
  });
});
