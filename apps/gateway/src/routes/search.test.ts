import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';

// Mock middleware to bypass actual security checks during tests
vi.mock('../middleware/authenticate', () => ({
  authenticate: (req: any, res: any, next: any) => {
    // If mock headers are provided, populate req.user for testing
    const mockUserRoles = req.headers['x-mock-user-roles'];
    const mockTenantId = req.headers['x-mock-tenant-id'] || 'test-tenant';
    const mockUserId = req.headers['x-mock-user-id'] || 'test-user';

    if (mockUserRoles || req.headers['x-mock-auth'] === 'true') {
        req.user = {
            id: mockUserId,
            tenantId: mockTenantId,
            roles: mockUserRoles ? mockUserRoles.split(',') : [],
            clearance: 0
        };
    }
    next();
  },
}));

// Mock middleware to bypass OPA and avoid external calls
vi.mock('../middleware/policyGuard', () => ({
  policyGuard: (req: any, res: any, next: any) => {
    // Already handled by authenticate mock or next()
    next();
  },
}));

// Mock typesense client to avoid connection errors
vi.mock('../lib/typesense', () => ({
  typesenseClient: {
    collections: () => ({
      documents: () => ({
        search: vi.fn().mockResolvedValue({ hits: [] }),
      }),
    }),
  },
}));

import app from '../server';

describe('Search Routes Security', () => {
  it('should block unauthorized access (no roles)', async () => {
    const res = await request(app)
      .post('/v1/search/admin/reindex')
      .send({});

    expect(res.status).toBe(403);
  });

  it('should block unauthorized access (header provided but req.user missing)', async () => {
    // This confirms we are ignoring headers now because authenticate mock won't set req.user
    const res = await request(app)
      .post('/v1/search/admin/reindex')
      .set('x-roles', 'admin')
      .send({});

    // Without req.user, search route's getTenantId will throw error (or 403 by middleware if not mocked)
    // In this case, search.ts throws 'Unauthorized: Tenant context required'
    expect(res.status).toBe(500);
    expect(res.body.error).toContain('Tenant context required');
  });

  it('should allow authorized access (req.user has admin)', async () => {
    const res = await request(app)
      .post('/v1/search/admin/reindex')
      .set('x-mock-user-roles', 'admin') // Populates req.user via mock authenticate
      .set('x-mock-tenant-id', 'admin-tenant')
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('triggered');
  });

  it('should block access if req.user has wrong role (non-admin)', async () => {
    const res = await request(app)
      .post('/v1/search/admin/reindex')
      .set('x-mock-user-roles', 'user')
      .send({});

    expect(res.status).toBe(403);
  });
});
