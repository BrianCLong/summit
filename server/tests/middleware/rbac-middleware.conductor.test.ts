import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import {
  AuthenticatedRequest,
  rbacManager,
  requirePermission,
} from '../../src/conductor/auth/rbac-middleware.js';

const describeIf =
  process.env.NO_NETWORK_LISTEN === 'true' ? describe.skip : describe;

function buildUser(role: string) {
  return {
    userId: `${role}-user`,
    sub: `${role}-user`,
    email: `${role}@example.com`,
    roles: [role],
  };
}

function invokePermission(permission: string, role: string) {
  const req = {
    user: buildUser(role),
    headers: {},
  } as unknown as AuthenticatedRequest;

  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  } as any;

  const next = jest.fn();

  requirePermission(permission)(req as any, res as any, next);

  return { res, next };
}

function buildTestApp() {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    const role = (req.headers['x-test-role'] as string) || 'viewer';
    const authReq = req as unknown as AuthenticatedRequest;
    authReq.user = buildUser(role);
    next();
  });

  app.post(
    '/api/conductor/pricing/refresh',
    requirePermission('pricing:refresh'),
    (req, res) => res.json({ refreshed: true }),
  );

  app.get(
    '/api/conductor/flags',
    requirePermission('flags:read'),
    (req, res) => res.json({ flags: [] }),
  );

  return app;
}

describeIf('Conductor RBAC middleware', () => {
  describe('default role permissions', () => {
    it('grants operator pricing, capacity, and flags access', () => {
      const permissions = rbacManager.getUserPermissions(buildUser('operator'));

      expect(permissions.has('pricing:refresh')).toBe(true);
      expect(permissions.has('pricing:read')).toBe(true);
      expect(permissions.has('capacity:reserve')).toBe(true);
      expect(permissions.has('capacity:release')).toBe(true);
      expect(permissions.has('capacity:read')).toBe(true);
      expect(permissions.has('flags:read')).toBe(true);
    });

    it('restricts analyst to read-only pricing and capacity visibility', () => {
      const permissions = rbacManager.getUserPermissions(buildUser('analyst'));

      expect(permissions.has('pricing:read')).toBe(true);
      expect(permissions.has('capacity:read')).toBe(true);
      expect(permissions.has('pricing:refresh')).toBe(false);
      expect(permissions.has('capacity:reserve')).toBe(false);
      expect(permissions.has('flags:read')).toBe(false);
    });

    it('only allows viewer to read pricing', () => {
      const permissions = rbacManager.getUserPermissions(buildUser('viewer'));

      expect(permissions.has('pricing:read')).toBe(true);
      expect(permissions.has('pricing:refresh')).toBe(false);
      expect(permissions.has('capacity:read')).toBe(false);
    });
  });

  describe('requirePermission enforcement', () => {
    it('allows operator to refresh pricing and reserve capacity', () => {
      const pricingResult = invokePermission('pricing:refresh', 'operator');
      const capacityResult = invokePermission('capacity:reserve', 'operator');
      const flagsResult = invokePermission('flags:read', 'operator');

      expect(pricingResult.next).toHaveBeenCalled();
      expect(capacityResult.next).toHaveBeenCalled();
      expect(flagsResult.next).toHaveBeenCalled();
    });

    it('allows analyst to read pricing and capacity but blocks mutations and flags', () => {
      const pricingRead = invokePermission('pricing:read', 'analyst');
      const capacityRead = invokePermission('capacity:read', 'analyst');
      const pricingRefresh = invokePermission('pricing:refresh', 'analyst');
      const capacityReserve = invokePermission('capacity:reserve', 'analyst');
      const flagsRead = invokePermission('flags:read', 'analyst');

      expect(pricingRead.next).toHaveBeenCalled();
      expect(capacityRead.next).toHaveBeenCalled();
      expect(pricingRefresh.res.status).toHaveBeenCalledWith(403);
      expect(capacityReserve.res.status).toHaveBeenCalledWith(403);
      expect(flagsRead.res.status).toHaveBeenCalledWith(403);
    });

    it('limits viewer to pricing read and denies other pricing/capacity/flag scopes', () => {
      const pricingRead = invokePermission('pricing:read', 'viewer');
      const pricingRefresh = invokePermission('pricing:refresh', 'viewer');
      const capacityRead = invokePermission('capacity:read', 'viewer');
      const capacityReserve = invokePermission('capacity:reserve', 'viewer');
      const flagsRead = invokePermission('flags:read', 'viewer');

      expect(pricingRead.next).toHaveBeenCalled();
      expect(pricingRefresh.res.status).toHaveBeenCalledWith(403);
      expect(capacityRead.res.status).toHaveBeenCalledWith(403);
      expect(capacityReserve.res.status).toHaveBeenCalledWith(403);
      expect(flagsRead.res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('route-level enforcement', () => {
    const app = buildTestApp();

    it('allows operator to call pricing refresh endpoint', async () => {
      await request(app)
        .post('/api/conductor/pricing/refresh')
        .set('x-test-role', 'operator')
        .expect(200);
    });

    it('blocks viewer from pricing refresh and flags', async () => {
      await request(app)
        .post('/api/conductor/pricing/refresh')
        .set('x-test-role', 'viewer')
        .expect(403);

      await request(app)
        .get('/api/conductor/flags')
        .set('x-test-role', 'viewer')
        .expect(403);
    });
  });
});
