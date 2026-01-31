import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';

// Mock middleware to bypass OPA and avoid external calls
// We use x-mock-user-roles to populate req.user for testing priority
vi.mock('../middleware/policyGuard', () => ({
  policyGuard: (req: any, res: any, next: any) => {
    const mockUserRoles = req.headers['x-mock-user-roles'];
    if (mockUserRoles) {
        req.user = { roles: mockUserRoles.split(',') };
    }
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
    // This confirms we are ignoring headers now
    const res = await request(app)
      .post('/v1/search/admin/reindex')
      .set('x-roles', 'admin')
      .send({});

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Forbidden');
  });

  it('should allow authorized access (req.user has admin)', async () => {
    const res = await request(app)
      .post('/v1/search/admin/reindex')
      .set('x-mock-user-roles', 'admin') // Populates req.user.roles
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
