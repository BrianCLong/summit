import request from 'supertest';
import { describe, it, expect, beforeEach } from '@jest/globals';
import { buildApp } from '../../../apps/api/src/app.js';
import { RBACManager } from '../../../packages/authentication/src/rbac/rbac-manager.js';

describe('Security Bypass Integration Tests', () => {
  let app: any;
  let rbacManager: RBACManager;

  beforeEach(() => {
    rbacManager = new RBACManager();
    app = buildApp({ rbacManager });
  });

  describe('Authentication Enforcement (CN-001)', () => {
    it('should reject requests without Authorization header or API key', async () => {
      const response = await request(app).get('/epics');
      expect(response.status).toBe(401);
      expect(response.body.error).toBe('unauthorized');
    });

    it('should reject requests with invalid token format', async () => {
      const response = await request(app)
        .get('/epics')
        .set('Authorization', 'InvalidToken')
        .set('X-Tenant-ID', 'test-tenant');

      // If this passes (returns 200 or 404/403 but not 401), it's a bypass!
      // In our mock environment, /epics might return 404 or 200 depending on EpicService
      expect(response.status).toBe(401);
    });
  });

  describe('Tenant Isolation Enforcement (CN-003)', () => {
    it('should reject authenticated requests without X-Tenant-ID header', async () => {
      const response = await request(app)
        .get('/epics')
        .set('Authorization', 'Bearer valid-token');

      // The current implementation in apps/api/src/middleware/security.ts
      // returns 400 if tenantId is missing in requireAuth
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('tenant_context_required');
    });

    it('should reject requests with invalid tenant ID format', async () => {
      const response = await request(app)
        .get('/epics')
        .set('Authorization', 'Bearer valid-token')
        .set('X-Tenant-ID', 'invalid!tenant@');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('invalid_tenant_id');
    });
  });

  describe('Health Check (No Auth Required)', () => {
    it('should allow access to /health without authentication', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
    });
  });
});
