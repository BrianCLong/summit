import request from 'supertest';
import express from 'express';

const mockTenantService = {
  getTenantSettings: jest.fn(),
  updateSettings: jest.fn(),
  disableTenant: jest.fn(),
  createTenant: jest.fn(),
  listTenants: jest.fn(),
  getTenant: jest.fn(),
  rollbackSettings: jest.fn(),
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

const mockApplyProfile = jest.fn();
jest.mock('../../services/PolicyProfileService.js', () => ({
  policyProfileService: {
    applyProfile: mockApplyProfile,
  },
}));

const mockSetTenantPlan = jest.fn();
const mockSetTenantOverride = jest.fn();
jest.mock('../../lib/resources/QuotaConfig.js', () => ({
  quotaConfigService: {
    setTenantPlan: mockSetTenantPlan,
    setTenantOverride: mockSetTenantOverride,
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
    mockTenantService.listTenants.mockResolvedValue([
      { id: 'tenant-1', name: 'Acme', slug: 'acme' },
    ]);
    mockTenantService.getTenant.mockResolvedValue({
      id: 'tenant-1',
      name: 'Acme',
      slug: 'acme',
      settings: { policy_profile: 'baseline' },
    });
    mockTenantService.rollbackSettings.mockResolvedValue({
      tenant: { id: 'tenant-1', settings: { theme: 'light' } },
      rolledBackTo: { id: 'history-1' },
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
    expect(mockTenantService.updateSettings).toHaveBeenCalledWith(
      'tenant-1',
      { theme: 'dark' },
      'user-1',
      'settings_update',
    );
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

  it('lists tenants for super admin', async () => {
    currentUser = { id: 'admin-1', role: 'SUPER_ADMIN', tenantId: 'tenant-1' };
    const res = await request(app).get('/api/tenants');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([{ id: 'tenant-1', name: 'Acme', slug: 'acme' }]);
  });

  it('applies policy profile with receipt', async () => {
    const res = await request(app)
      .post('/api/tenants/tenant-1/policy-profile')
      .send({ profileId: 'strict' });
    expect(res.status).toBe(200);
    expect(mockApplyProfile).toHaveBeenCalledWith('tenant-1', 'strict', 'user-1');
    expect(res.body.receipt.action).toBe('TENANT_POLICY_PROFILE_APPLIED');
  });

  it('updates quotas with receipt', async () => {
    const res = await request(app)
      .post('/api/tenants/tenant-1/quotas')
      .send({ plan: 'standard', overrides: { api_rpm: 9000 } });
    expect(res.status).toBe(200);
    expect(mockSetTenantPlan).toHaveBeenCalledWith('tenant-1', 'standard');
    expect(mockSetTenantOverride).toHaveBeenCalledWith('tenant-1', { api_rpm: 9000 });
    expect(res.body.receipt.action).toBe('TENANT_QUOTAS_UPDATED');
  });

  it('rolls back settings with receipt', async () => {
    const res = await request(app)
      .post('/api/tenants/tenant-1/settings/rollback')
      .send({ reason: 'undo' });
    expect(res.status).toBe(200);
    expect(mockTenantService.rollbackSettings).toHaveBeenCalledWith('tenant-1', 'user-1', 'undo');
    expect(res.body.receipt.action).toBe('TENANT_SETTINGS_ROLLBACK');
  });
});
