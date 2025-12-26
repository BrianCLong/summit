
import { describe, it, expect, beforeAll, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

// Define the User type to match what we need
type MockUser = {
  id: string;
  tenantId: string;
  role: string;
  tenant_id: string;
  permissions: string[];
};

// Global mutable state for tests
let currentUser: MockUser = {
  id: 'user-a',
  tenantId: 'tenant-a',
  role: 'ADMIN',
  tenant_id: 'tenant-a',
  permissions: ['read:tenant', 'update:tenant', 'create:tenant']
};

const mockTenantService = {
  getTenant: jest.fn(),
  getTenantSettings: jest.fn(),
  updateSettings: jest.fn(),
  disableTenant: jest.fn(),
  createTenant: jest.fn(),
};

// Hoist mocks to avoid "access before init"
jest.mock('../../src/middleware/auth.js', () => ({
  ensureAuthenticated: (req: any, res: any, next: any) => {
    req.user = currentUser;
    next();
  },
  requirePermission: () => (req: any, res: any, next: any) => next(),
  ensurePolicy: () => (req: any, res: any, next: any) => next(),
  ensureRole: () => (req: any, res: any, next: any) => next(),
}), { virtual: true });

jest.mock('../../src/services/TenantService.js', () => ({
  tenantService: mockTenantService,
  createTenantSchema: { parse: (x: any) => x },
}), { virtual: true });

jest.mock('../../src/middleware/abac.js', () => ({
  ensurePolicy: () => (req: any, res: any, next: any) => next(),
}), { virtual: true });

jest.mock('../../src/config/database.js', () => ({
  getPostgresPool: () => ({ query: jest.fn() }),
}), { virtual: true });

jest.mock('../../src/repos/ProvenanceRepo.js', () => ({
    ProvenanceRepo: class {
        by() { return []; }
    }
}), { virtual: true });

jest.mock('../../src/utils/logger.js', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
}), { virtual: true });

// Also mock ./provision because it's imported by tenants.ts
jest.mock('../../src/routes/tenants/provision.js', () => express.Router(), { virtual: true });


// Import routes AFTER mocking
import tenantRoutes from '../../src/routes/tenants';

describe('Red Team: Tenant Isolation Validation', () => {
  let app: any;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/tenants', tenantRoutes);
  });

  it('ATTACK: Tenant B tries to access Tenant A settings', async () => {
    // Setup: User is from Tenant B
    currentUser = {
      id: 'user-b',
      tenantId: 'tenant-b',
      tenant_id: 'tenant-b',
      role: 'ADMIN',
      permissions: []
    };

    // Target: Tenant A
    const targetTenantId = 'tenant-a';

    (mockTenantService.getTenantSettings as any).mockResolvedValue({ some: 'secret' });

    const res = await request(app)
      .get(`/api/tenants/${targetTenantId}/settings`);

    // Expectation: Access Denied
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Forbidden');
  });

  it('ATTACK: Tenant B tries to spoof x-tenant-id header (Middleware Bypass)', async () => {
    // Setup: User is from Tenant B
    currentUser = {
      id: 'user-b',
      tenantId: 'tenant-b',
      tenant_id: 'tenant-b',
      role: 'ADMIN',
      permissions: []
    };

    const targetTenantId = 'tenant-a';

    const res = await request(app)
      .get(`/api/tenants/${targetTenantId}/settings`)
      .set('x-tenant-id', targetTenantId); // Attacker tries to lie

    expect(res.status).toBe(403);
  });

  it('ATTACK: Accessing own tenant should work', async () => {
    currentUser = {
      id: 'user-a',
      tenantId: 'tenant-a',
      tenant_id: 'tenant-a',
      role: 'ADMIN',
      permissions: []
    };

    (mockTenantService.getTenantSettings as any).mockResolvedValue({ some: 'data' });

    const res = await request(app)
      .get(`/api/tenants/tenant-a/settings`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ some: 'data' });
  });

  it('ATTACK: IDOR - Resource ID manipulation in update', async () => {
     // User B tries to update Tenant A
     currentUser = {
      id: 'user-b',
      tenantId: 'tenant-b',
      tenant_id: 'tenant-b',
      role: 'ADMIN',
      permissions: []
    };

    const res = await request(app)
        .put(`/api/tenants/tenant-a/settings`)
        .send({ settings: { hack: true } });

    expect(res.status).toBe(403);
  });

  it('ATTACK: Super Admin should bypass isolation', async () => {
      currentUser = {
          id: 'admin',
          tenantId: 'system',
          tenant_id: 'system',
          role: 'SUPER_ADMIN',
          permissions: []
      };

      (mockTenantService.getTenantSettings as any).mockResolvedValue({ admin: 'view' });

      const res = await request(app)
        .get(`/api/tenants/tenant-a/settings`);

      expect(res.status).toBe(200);
  });
});
