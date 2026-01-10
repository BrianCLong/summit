import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const mockQuery = jest.fn();
const mockRelease = jest.fn();

// ESM-compatible mocking using unstable_mockModule
jest.unstable_mockModule('../../../src/config/database.js', () => ({
  getPostgresPool: () => ({
    connect: jest.fn(async () => ({
      query: mockQuery,
      release: mockRelease.mockResolvedValue(undefined),
    })),
  }),
}));

jest.unstable_mockModule('../../../src/middleware/auth.js', () => ({
  ensureAuthenticated: (req: any, _res: any, next: any) => {
    const tenant = req.headers['x-tenant-id'] || 'tenant-123';
    req.user = { id: 'user-1', tenantId: tenant, roles: ['ADMIN'] };
    next();
  },
}));

// Mock TenantValidator properly with same structure as real module
jest.unstable_mockModule('../../../src/middleware/tenantValidator.js', () => {
  class MockTenantValidator {
    static validateTenantAccess(context: any, requestedTenantId: string) {
      const userTenantId = context.user?.tenantId;
      if (userTenantId !== requestedTenantId) {
        const error: any = new Error('Cross-tenant access denied');
        error.extensions = { code: 'CROSS_TENANT_ACCESS_DENIED' };
        throw error;
      }
      return {
        tenantId: requestedTenantId,
        userId: context.user?.id,
        roles: context.user?.roles || [],
        permissions: [],
        environment: 'test',
        privilegeTier: 'standard',
      };
    }
  }
  return { TenantValidator: MockTenantValidator };
});

jest.unstable_mockModule('../../../src/services/PricingEngine.js', () => ({
  __esModule: true,
  default: {
    getEffectivePlan: jest.fn().mockResolvedValue({
      plan: { limits: { 'llm.tokens': { unitPrice: 0.001 } } },
    }),
  },
}));

jest.unstable_mockModule('../../../src/validation/index.js', () => ({
  SanitizationUtils: {
    sanitizeUserInput: jest.fn((input: any) => input),
  },
  SecurityValidator: {
    validateInput: jest.fn(() => ({ valid: true, errors: [] })),
  },
}));

jest.unstable_mockModule('../../../src/middleware/request-schema-validator.js', () => ({
  buildRequestValidator: () => (req: any, _res: any, next: any) => {
    // Basic datetime validation for 'from' query param
    if (req.query.from && !req.query.from.match(/^\d{4}-\d{2}-\d{2}T/)) {
      return next({
        status: 400,
        message: 'Validation failed',
      });
    }
    next();
  },
}));

// Dynamic imports after mocks are set up
const { default: request } = await import('supertest');
const { default: express } = await import('express');
const { default: usageRouter } = await import('../../../src/routes/tenants/usage.js');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/tenants/:tenantId/usage', usageRouter);

// Error handler to catch validation errors
app.use((err: any, _req: any, res: any, _next: any) => {
  if (err.status === 400) {
    return res.status(400).json({ error: 'Validation failed' });
  }
  res.status(500).json({ error: 'Internal server error' });
});

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

    const res = await request(app)
      .get('/api/tenants/tenant-123/usage')
      .query({
        from: '2024-01-01T00:00:00.000Z',
        to: '2024-01-31T23:59:59.000Z',
        dimension: 'llm.tokens',
        limit: '5',
      })
      .set('x-tenant-id', 'tenant-123');

    expect(res.status).toBe(200);
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

    const body = res.body;
    expect(body).toBeDefined();
    expect(body.rollups).toBeDefined();
    expect(Array.isArray(body.rollups)).toBe(true);
    expect(body.rollups[0]).toMatchObject({
      dimension: 'llm.tokens',
      totalQuantity: 1234,
      unit: 'tokens',
      breakdown: { 'model:gpt-4.1': 1200, 'model:gpt-3.5': 34 },
    });
  });

  it('rejects cross-tenant access', async () => {
    const res = await request(app)
      .get('/api/tenants/other-tenant/usage')
      .set('x-tenant-id', 'tenant-123');

    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ error: 'tenant_access_denied' });
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('validates query parameters', async () => {
    const res = await request(app)
      .get('/api/tenants/tenant-123/usage')
      .query({ from: 'not-a-date' })
      .set('x-tenant-id', 'tenant-123');

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ error: 'Validation failed' });
    expect(mockQuery).not.toHaveBeenCalled();
  });
});
