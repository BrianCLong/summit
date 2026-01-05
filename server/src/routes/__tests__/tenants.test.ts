import request from 'supertest';
import express from 'express';
import * as database from '../../config/database.js';
import { ProvenanceRepo } from '../../repos/ProvenanceRepo.js';

const mockTenantService = {
  getTenantSettings: jest.fn(),
  updateSettings: jest.fn(),
  disableTenant: jest.fn(),
  createTenant: jest.fn(),
};

const mockTenantUsageService = {
  getTenantUsage: jest.fn(),
};

let currentUser: any = {
  id: 'user-1',
  role: 'admin',
  tenantId: 'tenant-1',
};

jest.mock('../../services/TenantService.js', () => ({
  tenantService: mockTenantService,
  createTenantSchema: {
    parse: (v: any) => v,
    extend: () => ({
      parse: (v: any) => v,
    }),
  },
}));

jest.mock('../../services/TenantUsageService.js', () => ({
  tenantUsageService: mockTenantUsageService,
}));

jest.mock('../../config/database.js', () => ({
  getPostgresPool: jest.fn(() => ({
    connect: jest.fn().mockResolvedValue({
      query: jest.fn().mockResolvedValue({ rows: [{ id: 'event-1' }] }),
      release: jest.fn(),
    }),
  })),
  getRedisClient: jest.fn(() => null),
}));

jest.mock('../../middleware/auth.js', () => ({
  ensureAuthenticated: (req: any, _res: any, next: any) => {
    req.user = currentUser;
    return next();
  },
}));

const ensurePolicy = jest.fn((_action: string, _resource: string) => (_req: any, _res: any, next: any) => next());
jest.mock('../../middleware/abac.js', () => ({ ensurePolicy }));

jest.mock('../../provenance/ledger.js', () => ({
  provenanceLedger: {
    appendEntry: jest.fn(),
  },
}));

const mockRepoBy = jest.fn();
jest.mock('../../repos/ProvenanceRepo.js', () => ({
  ProvenanceRepo: jest.fn().mockImplementation(() => ({
    by: mockRepoBy,
  })),
}));

const tenantsRouter = require('../tenants.js').default;

describe('tenants routes', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/tenants', tenantsRouter);

  beforeEach(() => {
    jest.clearAllMocks();
    (ProvenanceRepo as jest.Mock).mockImplementation(() => ({
      by: mockRepoBy,
    }));
    (database.getPostgresPool as jest.Mock).mockReturnValue({
      connect: jest.fn().mockResolvedValue({
        query: jest.fn().mockResolvedValue({ rows: [{ id: 'event-1' }] }),
        release: jest.fn(),
      }),
    });
    (database.getRedisClient as jest.Mock).mockReturnValue(null);
    currentUser = { id: 'user-1', role: 'admin', tenantId: 'tenant-1' };
    mockTenantService.getTenantSettings.mockResolvedValue({
      id: 'tenant-1',
      settings: { theme: 'light' },
      config: {},
      status: 'active',
    });
    mockTenantService.updateSettings.mockResolvedValue({
      id: 'tenant-1',
      settings: { theme: 'dark' },
      config: {},
      status: 'active',
    });
    mockTenantService.disableTenant.mockResolvedValue({
      id: 'tenant-1',
      status: 'disabled',
      config: {},
      settings: {},
    });
    mockTenantService.createTenant.mockResolvedValue({
      id: 'tenant-1',
      name: 'Acme',
      slug: 'acme',
      residency: 'US',
    });
    mockTenantUsageService.getTenantUsage.mockResolvedValue({
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
    expect(mockTenantService.getTenantSettings).toHaveBeenCalledWith('tenant-1');
  });

  it('updates settings and issues receipt', async () => {
    const res = await request(app)
      .put('/api/tenants/tenant-1/settings')
      .send({ settings: { theme: 'dark' } });
    expect(res.status).toBe(200);
    expect(res.body.data.settings.theme).toBe('dark');
    expect(res.body.receipt.action).toBe('TENANT_SETTINGS_UPDATED');
    expect(mockTenantService.updateSettings).toHaveBeenCalledWith('tenant-1', { theme: 'dark' }, 'user-1');
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
    expect(mockTenantUsageService.getTenantUsage).toHaveBeenCalledWith('tenant-1', '7d');
  });
});
