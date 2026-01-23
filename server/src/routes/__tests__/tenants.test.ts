import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';

// Mock functions declared before mocks
const mockGetTenantSettings = jest.fn();
const mockUpdateSettings = jest.fn();
const mockDisableTenant = jest.fn();
const mockCreateTenant = jest.fn();
const mockGetTenantUsage = jest.fn();
const mockGetPostgresPool = jest.fn();
const mockGetRedisClient = jest.fn();
const mockAppendEntry = jest.fn();
const mockRepoBy = jest.fn();
const mockEnsurePolicy = jest.fn((_action: string, _resource: string) => (_req: any, _res: any, next: any) => next());

let currentUser: any = {
  id: 'user-1',
  role: 'admin',
  tenantId: 'tenant-1',
};

// ESM-compatible mocking using unstable_mockModule
jest.unstable_mockModule('../../services/TenantService.js', () => ({
  tenantService: {
    getTenantSettings: mockGetTenantSettings,
    updateSettings: mockUpdateSettings,
    disableTenant: mockDisableTenant,
    createTenant: mockCreateTenant,
  },
  createTenantSchema: {
    parse: (v: any) => v,
    extend: () => ({
      parse: (v: any) => v,
    }),
  },
  createTenantBaseSchema: {
    extend: () => ({
      parse: (v: any) => v,
    }),
  },
}));

jest.unstable_mockModule('../../services/TenantUsageService.js', () => ({
  tenantUsageService: {
    getTenantUsage: mockGetTenantUsage,
  },
}));

jest.unstable_mockModule('../../config/database.js', () => ({
  getPostgresPool: mockGetPostgresPool,
  getRedisClient: mockGetRedisClient,
}));

jest.unstable_mockModule('../../middleware/auth.js', () => ({
  ensureAuthenticated: (req: any, _res: any, next: any) => {
    req.user = currentUser;
    return next();
  },
}));

jest.unstable_mockModule('../../middleware/abac.js', () => ({
  ensurePolicy: mockEnsurePolicy,
}));

jest.unstable_mockModule('../../provenance/ledger.js', () => ({
  provenanceLedger: {
    appendEntry: mockAppendEntry,
  },
}));

jest.unstable_mockModule('../../repos/ProvenanceRepo.js', () => ({
  ProvenanceRepo: jest.fn().mockImplementation(() => ({
    by: mockRepoBy,
  })),
}));

// Dynamic imports AFTER mocks are set up
const tenantsRouter = (await import('../tenants.js')).default;
const { ProvenanceRepo } = await import('../../repos/ProvenanceRepo.js');
const database = await import('../../config/database.js');

const describeIf =
  process.env.NO_NETWORK_LISTEN === 'true' ? describe.skip : describe;

describeIf('tenants routes', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/tenants', tenantsRouter);

  beforeEach(() => {
    jest.clearAllMocks();
    (ProvenanceRepo as jest.Mock).mockImplementation(() => ({
      by: mockRepoBy,
    }));
    mockGetPostgresPool.mockReturnValue({
      connect: jest.fn().mockResolvedValue({
        query: jest.fn().mockResolvedValue({ rows: [{ id: 'event-1' }] }),
        release: jest.fn(),
      }),
    });
    mockGetRedisClient.mockReturnValue(null);
    currentUser = { id: 'user-1', role: 'admin', tenantId: 'tenant-1' };
    mockGetTenantSettings.mockResolvedValue({
      id: 'tenant-1',
      settings: { theme: 'light' },
      config: {},
      status: 'active',
    });
    mockUpdateSettings.mockResolvedValue({
      id: 'tenant-1',
      settings: { theme: 'dark' },
      config: {},
      status: 'active',
    });
    mockDisableTenant.mockResolvedValue({
      id: 'tenant-1',
      status: 'disabled',
      config: {},
      settings: {},
    });
    mockCreateTenant.mockResolvedValue({
      id: 'tenant-1',
      name: 'Acme',
      slug: 'acme',
      residency: 'US',
    });
    mockGetTenantUsage.mockResolvedValue({
      tenantId: 'tenant-1',
      range: { key: '7d', start: '2024-01-01T00:00:00.000Z', end: '2024-01-08T00:00:00.000Z' },
      totals: [{ kind: 'external_api.requests', unit: 'requests', total: 3 }],
      breakdown: {
        byWorkflow: [{ workflow: 'ingest', totals: [{ kind: 'external_api.requests', unit: 'requests', total: 3 }] }],
        byEnvironment: [{ environment: 'prod', totals: [{ kind: 'external_api.requests', unit: 'requests', total: 3 }] }],
        byWorkflowEnvironment: [
          {
            workflow: 'ingest',
            environment: 'prod',
            totals: [{ kind: 'external_api.requests', unit: 'requests', total: 3 }],
          },
        ],
      },
    });
    mockRepoBy.mockResolvedValue([{ id: 'event-1' }]);
  });

  it('returns settings with receipt', async () => {
    const res = await request(app).get('/api/tenants/tenant-1/settings');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.receipt).toBeDefined();
    expect(mockGetTenantSettings).toHaveBeenCalledWith('tenant-1');
  });

  it('updates settings and issues receipt', async () => {
    const res = await request(app)
      .put('/api/tenants/tenant-1/settings')
      .send({ settings: { theme: 'dark' } });
    expect(res.status).toBe(200);
    expect(res.body.data.settings.theme).toBe('dark');
    expect(res.body.receipt.action).toBe('TENANT_SETTINGS_UPDATED');
    expect(mockUpdateSettings).toHaveBeenCalledWith('tenant-1', { theme: 'dark' }, 'user-1');
  });

  it('disables tenant with receipt', async () => {
    const res = await request(app)
      .post('/api/tenants/tenant-1/disable')
      .send({ reason: 'test' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('disabled');
    expect(res.body.receipt.action).toBe('TENANT_DISABLED');
  });

  it('blocks cross-tenant access', async () => {
    currentUser = { id: 'user-2', role: 'user', tenantId: 'other-tenant' } as any;
    const res = await request(app).get('/api/tenants/tenant-1/settings');
    expect(res.status).toBe(403);
  });

  it('returns audit list with receipt', async () => {
    const res = await request(app).get('/api/tenants/tenant-1/audit?limit=1&offset=0');
    expect(mockRepoBy).toHaveBeenCalled();
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([{ id: 'event-1' }]);
    expect(res.body.receipt.action).toBe('TENANT_AUDIT_VIEWED');
  });

  it('returns usage summary with breakdowns', async () => {
    const res = await request(app).get('/api/tenants/tenant-1/usage?range=7d');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      tenantId: 'tenant-1',
      totals: [{ kind: 'external_api.requests', unit: 'requests', total: 3 }],
    });
    expect(res.body.data.breakdown.byWorkflow[0]).toMatchObject({ workflow: 'ingest' });
    expect(res.body.data.breakdown.byEnvironment[0]).toMatchObject({ environment: 'prod' });
    expect(mockGetTenantUsage).toHaveBeenCalledWith('tenant-1', '7d');
  });
});
