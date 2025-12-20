import request from 'supertest';
import express from 'express';

const mockTenantService = {
  getTenantSettings: jest.fn(),
  updateSettings: jest.fn(),
  disableTenant: jest.fn(),
  createTenant: jest.fn(),
};

let currentUser: any = {
  id: 'user-1',
  role: 'admin',
  tenantId: 'tenant-1',
};

jest.mock('../tenants', () => jest.requireActual('../tenants'));

jest.mock('../../services/TenantService.js', () => ({
  tenantService: mockTenantService,
  createTenantSchema: { parse: (v: any) => v },
}));

jest.mock('../../middleware/auth.js', () => ({
  ensureAuthenticated: (req: any, _res: any, next: any) => {
    req.user = currentUser;
    return next();
  },
}));

const ensurePolicy = jest.fn((_action: string, _resource: string) => (_req: any, _res: any, next: any) => next());
jest.mock('../../middleware/abac.js', () => ({ ensurePolicy }));

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
    const res = await request(app).get('/api/tenants/tenant-1/audit');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([{ id: 'event-1' }]);
    expect(res.body.receipt.action).toBe('TENANT_AUDIT_VIEWED');
  });
});
