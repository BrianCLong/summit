import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';

const mockGetTenantSettings = jest.fn();
const mockUpdateSettings = jest.fn();
const mockDisableTenant = jest.fn();
const mockCreateTenant = jest.fn();
const mockGetTenantUsage = jest.fn();
const mockGetPostgresPool = jest.fn();
const mockGetRedisClient = jest.fn();
const mockAppendEntry = jest.fn();
const mockRepoBy = jest.fn();
const mockUpdateStatus = jest.fn();
const mockCreateSensitiveOperationRequest = jest.fn();
const mockNormalizeApprovalActors = jest.fn();
const mockValidateDualControlRequirement = jest.fn();
const mockEnsurePolicy = jest.fn((_action: string, _resource: string) => (_req: any, _res: any, next: any) => next());

let currentUser: any = {
  id: 'user-1',
  role: 'admin',
  tenantId: 'tenant-1',
};

jest.unstable_mockModule('../../services/TenantService.js', () => ({
  tenantService: {
    getTenantSettings: mockGetTenantSettings,
    updateSettings: mockUpdateSettings,
    disableTenant: mockDisableTenant,
    createTenant: mockCreateTenant,
    updateStatus: mockUpdateStatus,
    createSensitiveOperationRequest: mockCreateSensitiveOperationRequest,
  },
  createTenantSchema: {
    parse: (v: any) => v,
    extend: () => ({ parse: (v: any) => v }),
  },
  createTenantBaseSchema: {
    extend: () => ({ parse: (v: any) => v }),
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

jest.unstable_mockModule('../../middleware/dual-control.js', () => ({
  normalizeApprovalActors: mockNormalizeApprovalActors,
  validateDualControlRequirement: mockValidateDualControlRequirement,
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

const tenantsRouter = (await import('../tenants.js')).default;
const { ProvenanceRepo } = await import('../../repos/ProvenanceRepo.js');

const describeIf = process.env.NO_NETWORK_LISTEN === 'true' ? describe.skip : describe;

describeIf('tenants routes', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/tenants', tenantsRouter);

  beforeEach(() => {
    jest.clearAllMocks();
    (ProvenanceRepo as jest.Mock).mockImplementation(() => ({ by: mockRepoBy }));
    mockGetPostgresPool.mockReturnValue({
      connect: jest.fn().mockResolvedValue({
        query: jest.fn().mockResolvedValue({ rows: [{ id: 'event-1' }] }),
        release: jest.fn(),
      }),
    });
    mockGetRedisClient.mockReturnValue(null);
    currentUser = { id: 'user-1', role: 'admin', tenantId: 'tenant-1' };

    mockGetTenantSettings.mockResolvedValue({ id: 'tenant-1', settings: { theme: 'light' }, config: {}, status: 'active' });
    mockUpdateSettings.mockResolvedValue({ id: 'tenant-1', settings: { theme: 'dark' }, config: {}, status: 'active' });
    mockDisableTenant.mockResolvedValue({ id: 'tenant-1', status: 'disabled', config: {}, settings: {} });
    mockUpdateStatus.mockResolvedValue({ id: 'tenant-1', status: 'suspended', config: {}, settings: {} });
    mockCreateTenant.mockResolvedValue({ id: 'tenant-1', name: 'Acme', slug: 'acme', residency: 'US' });
    mockCreateSensitiveOperationRequest.mockResolvedValue({
      id: 'req-1',
      action: 'export',
      tenantId: 'tenant-1',
      reason: 'legal hold',
      createdBy: 'user-1',
      createdAt: '2026-02-06T20:00:00.000Z',
      approvals: [
        { user_id: 'approver-1', role: 'compliance-officer' },
        { user_id: 'approver-2', role: 'security-admin' },
      ],
    });

    mockGetTenantUsage.mockResolvedValue({
      tenantId: 'tenant-1',
      range: { key: '7d', start: '2024-01-01T00:00:00.000Z', end: '2024-01-08T00:00:00.000Z' },
      totals: [{ kind: 'external_api.requests', unit: 'requests', total: 3 }],
      breakdown: {
        byWorkflow: [{ workflow: 'ingest', totals: [{ kind: 'external_api.requests', unit: 'requests', total: 3 }] }],
        byEnvironment: [{ environment: 'prod', totals: [{ kind: 'external_api.requests', unit: 'requests', total: 3 }] }],
        byWorkflowEnvironment: [{ workflow: 'ingest', environment: 'prod', totals: [{ kind: 'external_api.requests', unit: 'requests', total: 3 }] }],
      },
    });

    mockRepoBy.mockResolvedValue([{ id: 'event-1' }]);
    mockNormalizeApprovalActors.mockImplementation((approvals: any) => approvals);
    mockValidateDualControlRequirement.mockResolvedValue({ satisfied: true, violations: [], recordedApprovals: 2 });
  });

  it('returns settings with receipt', async () => {
    const res = await request(app).get('/api/tenants/tenant-1/settings');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.receipt).toBeDefined();
    expect(mockGetTenantSettings).toHaveBeenCalledWith('tenant-1');
  });

  it('updates settings and issues receipt', async () => {
    const res = await request(app).put('/api/tenants/tenant-1/settings').send({ settings: { theme: 'dark' } });
    expect(res.status).toBe(200);
    expect(res.body.data.settings.theme).toBe('dark');
    expect(res.body.receipt.action).toBe('TENANT_SETTINGS_UPDATED');
    expect(mockUpdateSettings).toHaveBeenCalledWith('tenant-1', { theme: 'dark' }, 'user-1');
  });

  it('disables tenant with receipt', async () => {
    const res = await request(app).post('/api/tenants/tenant-1/disable').send({ reason: 'test' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('disabled');
    expect(res.body.receipt.action).toBe('TENANT_DISABLED');
  });

  it('updates tenant status with receipt', async () => {
    const res = await request(app).patch('/api/tenants/tenant-1').send({ status: 'suspended', reason: 'maintenance' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('suspended');
    expect(res.body.receipt.action).toBe('TENANT_STATUS_UPDATED');
    expect(mockUpdateStatus).toHaveBeenCalledWith('tenant-1', 'suspended', 'user-1', 'maintenance');
  });

  it('returns 409 for blocked transitions', async () => {
    mockUpdateStatus.mockRejectedValueOnce(new Error('Disabled tenants require dedicated reactivation workflow'));
    const res = await request(app).patch('/api/tenants/tenant-1').send({ status: 'active', reason: 'reactivate' });
    expect(res.status).toBe(409);
  });

  it('creates export request when dual-control is satisfied', async () => {
    const payload = {
      reason: 'compliance export',
      approvals: [
        { user_id: 'approver-1', role: 'compliance-officer' },
        { user_id: 'approver-2', role: 'security-admin' },
      ],
    };
    const res = await request(app).post('/api/tenants/tenant-1/export-requests').send(payload);
    expect(res.status).toBe(202);
    expect(mockValidateDualControlRequirement).toHaveBeenCalled();
    expect(mockCreateSensitiveOperationRequest).toHaveBeenCalledWith(
      'tenant-1',
      'export',
      'compliance export',
      'user-1',
      payload.approvals,
      undefined,
    );
  });

  it('rejects delete request when dual-control fails', async () => {
    mockValidateDualControlRequirement.mockResolvedValueOnce({
      satisfied: false,
      violations: ['At least one compliance-officer approval is required'],
      recordedApprovals: 1,
    });

    const res = await request(app).post('/api/tenants/tenant-1/delete-requests').send({
      reason: 'gdpr erasure',
      approvals: [
        { user_id: 'approver-1', role: 'admin' },
        { user_id: 'approver-2', role: 'admin' },
      ],
    });

    expect(res.status).toBe(403);
    expect(mockCreateSensitiveOperationRequest).not.toHaveBeenCalled();
    expect(res.body.error).toBe('Dual-control requirement not satisfied');
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
