import { jest, describe, it, expect, beforeAll } from '@jest/globals';

let tenantMiddleware: typeof import('../../src/middleware/tenant.js').default;

beforeAll(async () => {
  jest.unstable_mockModule('../../src/services/RateLimiter.js', () => ({
    rateLimiter: {
      checkLimit: async () => ({
        allowed: true,
        total: 1,
        remaining: 1,
        reset: Date.now(),
      }),
    },
  }));
  const tenantIsolationGuardMock = {
    assertTenantContext: jest.fn(),
    evaluatePolicy: jest.fn(() => ({ allowed: true })),
  };
  jest.unstable_mockModule('../../src/tenancy/TenantIsolationGuard.js', () => ({
    tenantIsolationGuard: tenantIsolationGuardMock,
  }));
  jest.unstable_mockModule('../../src/tenancy/TenantIsolationGuard', () => ({
    tenantIsolationGuard: tenantIsolationGuardMock,
  }));
  jest.unstable_mockModule('../../src/monitoring/metrics.js', () => ({
    register: {
      registerMetric: () => undefined,
    },
  }));

  const tenantModule = await import('../../src/middleware/tenant.js');
  tenantMiddleware = tenantModule.default;
});

const buildRes = () => {
  const res: any = {};
  res.status = jest.fn((code: number) => {
    res.statusCode = code;
    return res;
  });
  res.json = jest.fn((payload: unknown) => {
    res.body = payload;
    return res;
  });
  res.setHeader = jest.fn();
  return res;
};

describe('tenant middleware', () => {
  it('rejects requests without tenant context when strict', async () => {
    const req: any = {
      headers: {},
      method: 'GET',
      baseUrl: '',
      path: '/protected',
    };
    const res = buildRes();
    const next = jest.fn();

    tenantMiddleware()(req, res, next);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('tenant_required');
  });

  it('attaches tenant context when header and auth are present', async () => {
    const req: any = {
      headers: {
        'x-tenant-id': 'tenant-abc',
      },
      method: 'GET',
      baseUrl: '',
      path: '/protected',
      user: {
        id: 'user-123',
        roles: ['analyst'],
      },
    };
    const res = buildRes();
    const next = jest.fn();

    tenantMiddleware()(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.tenant).toEqual(
      expect.objectContaining({
        tenantId: 'tenant-abc',
        roles: ['analyst'],
        subject: 'user-123',
      }),
    );
  });
});
