import express from 'express';
import request from 'supertest';
import usageRouter from '../../server/src/routes/tenants/usage.js';

const mockQuery = jest.fn();
const mockRelease = jest.fn();

jest.mock('../../server/src/config/database.js', () => ({
  getPostgresPool: () => ({
    connect: jest.fn().mockResolvedValue({
      query: mockQuery,
      release: mockRelease,
    }),
  }),
}));

jest.mock('../../server/src/middleware/auth.js', () => ({
  ensureAuthenticated: (req: any, _res: any, next: any) => {
    req.user = { id: 'contract-user', tenantId: 'tenant-abc', roles: ['ADMIN'] };
    next();
  },
}));

describe('API contract: tenant usage rollups', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/tenants/:tenantId/usage', usageRouter);
    mockQuery.mockReset();
    mockRelease.mockReset();
  });

  it('returns rollups that match the contract schema', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          period_start: '2024-02-01T00:00:00.000Z',
          period_end: '2024-02-29T23:59:59.000Z',
          kind: 'api.requests',
          total_quantity: 42,
          unit: 'requests',
          breakdown: { region: { us: 30, eu: 12 } },
        },
      ],
    });

    const res = await request(app)
      .get('/api/tenants/tenant-abc/usage?from=2024-02-01T00:00:00.000Z&to=2024-02-29T23:59:59.000Z')
      .expect(200);

    expect(res.body).toHaveProperty('tenantId', 'tenant-abc');
    expect(res.body.window).toEqual({
      from: '2024-02-01T00:00:00.000Z',
      to: '2024-02-29T23:59:59.000Z',
    });
    expect(Array.isArray(res.body.rollups)).toBe(true);
    expect(res.body.rollups[0]).toEqual(
      expect.objectContaining({
        dimension: 'api.requests',
        periodStart: '2024-02-01T00:00:00.000Z',
        periodEnd: '2024-02-29T23:59:59.000Z',
        totalQuantity: 42,
        unit: 'requests',
        breakdown: { region: { us: 30, eu: 12 } },
      }),
    );
  });
});
