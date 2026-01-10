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

const runRequest = async (params: {
  tenantId: string;
  query?: Record<string, any>;
  headers?: Record<string, string>;
}) => {
  const req: any = {
    method: 'GET',
    url: '/',
    path: '/',
    baseUrl: '/api/tenants/' + params.tenantId + '/usage',
    params: { tenantId: params.tenantId },
    query: params.query ?? {},
    headers: params.headers ?? {},
    body: {},
  };
  const res: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };

  await new Promise<void>((resolve, reject) => {
    usageRouter.handle(req, res, (err: any) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });

  return res;
};

describe('GET /api/tenants/:tenantId/usage', () => {
  beforeEach(() => {
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

    const res = await runRequest({
      tenantId: 'tenant-123',
      query: {
        from: '2024-01-01T00:00:00.000Z',
        to: '2024-01-31T23:59:59.000Z',
        dimension: 'llm.tokens',
        limit: '5',
      },
    });

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
    const body = res.json.mock.calls[0][0];
    expect(body.rollups[0]).toMatchObject({
      dimension: 'llm.tokens',
      totalQuantity: 1234,
      unit: 'tokens',
      breakdown: { 'model:gpt-4.1': 1200, 'model:gpt-3.5': 34 },
    });
  });

  it('rejects cross-tenant access', async () => {
    const res = await runRequest({
      tenantId: 'other-tenant',
      headers: { 'x-tenant-id': 'tenant-123' },
    });

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'tenant_access_denied' }),
    );
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('validates query parameters', async () => {
    const res = await runRequest({
      tenantId: 'tenant-123',
      query: { from: 'not-a-date' },
    });

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Validation failed' }),
    );
    expect(mockQuery).not.toHaveBeenCalled();
  });
});
