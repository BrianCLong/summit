import express from 'express';
import request from 'supertest';
import { describe, beforeEach, it, expect, jest, afterEach, beforeAll, afterAll } from '@jest/globals';

// Mock functions declared before mocks
const mockQuery = jest.fn();
const mockRelease = jest.fn();
const mockConnect = jest.fn(async () => ({
  query: mockQuery,
  release: mockRelease,
}));
const mockGetEffectivePlan = jest.fn();

let currentUser: any = {
  id: 'user-1',
  tenantId: 'tenant-1',
};

// ESM-compatible mocking using unstable_mockModule
jest.unstable_mockModule('../../config/database.js', () => ({
  getPostgresPool: () => ({
    connect: mockConnect,
  }),
}));

jest.unstable_mockModule('../../middleware/auth.js', () => ({
  ensureAuthenticated: (req: any, _res: any, next: any) => {
    req.user = currentUser;
    return next();
  },
}));

jest.unstable_mockModule('../../middleware/request-schema-validator.js', () => ({
  buildRequestValidator: () => (_req: any, _res: any, next: any) => next(),
}));

jest.unstable_mockModule('../../services/PricingEngine.js', () => ({
  __esModule: true,
  default: {
    getEffectivePlan: mockGetEffectivePlan,
  },
}));

// Dynamic imports AFTER mocks are set up
const tenantUsageRouter = (await import('../tenants/usage.js')).default;

const run = process.env.NO_NETWORK_LISTEN !== 'true';
const describeIf = run ? describe : describe.skip;

describeIf('tenant usage routes', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/tenants/:tenantId/usage', tenantUsageRouter);

  beforeEach(() => {
    jest.clearAllMocks();
    currentUser = { id: 'user-1', tenantId: 'tenant-1' };
    mockConnect.mockResolvedValue({
      query: mockQuery,
      release: mockRelease,
    });
    mockQuery.mockResolvedValue({
      rows: [
        {
          period_start: new Date('2025-01-01T00:00:00Z'),
          period_end: new Date('2025-01-02T00:00:00Z'),
          kind: 'api_calls',
          total_quantity: 10,
          unit: 'calls',
          breakdown: {},
        },
      ],
    });
    mockGetEffectivePlan.mockResolvedValue({
      plan: {
        limits: {
          api_calls: { unitPrice: 0.25 },
        },
      },
    });
  });

  it('returns usage rollups with estimated costs', async () => {
    const res = await request(app).get('/api/tenants/tenant-1/usage');
    expect(res.status).toBe(200);
    expect(res.body.rollups).toHaveLength(1);
    expect(res.body.rollups[0]).toMatchObject({
      dimension: 'api_calls',
      totalQuantity: 10,
      unit: 'calls',
      estimatedCost: 2.5,
    });
    expect(res.body.totalEstimatedCost).toBe(2.5);
  });

  it('exports usage rollups as JSON', async () => {
    const res = await request(app).get('/api/tenants/tenant-1/usage/export.json');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/json');
    const payload = JSON.parse(res.text);
    expect(payload.rollups[0]).toMatchObject({
      dimension: 'api_calls',
      totalQuantity: 10,
      unit: 'calls',
      estimatedCost: 2.5,
    });
  });

  it('exports usage rollups as CSV', async () => {
    const res = await request(app).get('/api/tenants/tenant-1/usage/export.csv');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    const lines = res.text.trim().split('\n');
    expect(lines[0]).toBe(
      'period_start,period_end,dimension,total_quantity,unit,estimated_cost',
    );
    expect(lines[1]).toContain('api_calls');
  });

  it('blocks cross-tenant export access', async () => {
    currentUser = { id: 'user-2', tenantId: 'other-tenant' };
    const res = await request(app).get('/api/tenants/tenant-1/usage/export.json');
    expect(res.status).toBe(403);
  });
});
