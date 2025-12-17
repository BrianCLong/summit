import request from 'supertest';
import { app } from './test-app';

jest.mock('../../src/middleware/auth', () => ({
  ensureAuthenticated: (req, res, next) => {
    // Default to a non-admin user
    req.user = { id: 'user-123', tenantId: 'tenant-123', role: 'user' };
    next();
  },
  ensureRole: (role) => (req, res, next) => {
    if (req.user?.role !== role) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  },
}));

jest.mock('../../src/temporal/control.js', () => ({
  enableTemporal: jest.fn(),
  disableTemporal: jest.fn(),
}));

describe('AuthZ Regression Tests: Admin Routes', () => {
  it('denies non-admin access to /admin/config', async () => {
    const res = await request(app).get('/admin/config');
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Forbidden');
  });
});
