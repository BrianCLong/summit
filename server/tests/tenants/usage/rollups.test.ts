import express from 'express';
import request from 'supertest';
import usageRouter from '../../../src/routes/tenants/usage.js';

const mockQuery = jest.fn();
const mockRelease = jest.fn();

jest.mock('../../../src/config/database.js', () => ({
  getPostgresPool: () => ({
    connect: jest.fn().mockResolvedValue({
      query: mockQuery,
      release: mockRelease,
    }),
  }),
}));

jest.mock('../../../src/middleware/auth.js', () => ({
  ensureAuthenticated: (req: any, _res: any, next: any) => {
    const tenant = req.headers['x-tenant-id'] || 'tenant-123';
    req.user = { id: 'user-1', tenantId: tenant, roles: ['ADMIN'] };
    next();
  },
}));

describe('GET /api/tenants/:tenantId/usage', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/tenants/:tenantId/usage', usageRouter);
    mockQuery.mockReset();
    mockRelease.mockReset();
  });

  it('returns rollups with breakdowns for the tenant and filters by dimension', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          period_start: new Date('2024-01-01T00:00:00Z'),
          period_end: new Date('2024-01-31T23:59:59Z'),
          kind: 'llm.tokens',
          total_quantity: 1234,
          unit: 'tokens',
          breakdown: { 'model:gpt-4.1': 1200, 'model:gpt-3.5': 34 },
        },
      ],
    });

    const res = await request(app)
      .get(
        '/api/tenants/tenant-123/usage?from=2024-01-01T00:00:00.000Z&to=2024-01-31T23:59:59.000Z&dimension=llm.tokens&limit=5',
      )
      .expect(200);

    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('FROM usage_summaries'),
      expect.arrayContaining([
        'tenant-123',
        '2024-01-01T00:00:00.000Z',
        '2024-01-31T23:59:59.000Z',
        ['llm.tokens'],
      ]),
    );
    expect(res.body.rollups[0]).toMatchObject({
      dimension: 'llm.tokens',
      totalQuantity: 1234,
      unit: 'tokens',
      breakdown: { 'model:gpt-4.1': 1200, 'model:gpt-3.5': 34 },
    });
  });

  it('rejects cross-tenant access', async () => {
    const res = await request(app)
      .get('/api/tenants/other-tenant/usage')
      .set('x-tenant-id', 'tenant-123')
      .expect(403);

    expect(res.body.error).toBe('tenant_access_denied');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('validates query parameters', async () => {
    const res = await request(app)
      .get('/api/tenants/tenant-123/usage?from=not-a-date')
      .expect(400);

    expect(res.body.error).toBe('Validation failed');
    expect(mockQuery).not.toHaveBeenCalled();
  });
});
