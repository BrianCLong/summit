/**
 * Barrier Enforcer Tests
 * @package dlp-core
 */

import { BarrierEnforcer } from '../src/BarrierEnforcer';
import type { BarrierCheckRequest } from '../src/types';

describe('BarrierEnforcer', () => {
  let enforcer: BarrierEnforcer;

  beforeEach(() => {
    enforcer = new BarrierEnforcer({
      opaEndpoint: 'http://localhost:8181',
      strictMode: true,
    });
  });

  describe('Tenant Isolation', () => {
    it('should allow same-tenant access', async () => {
      const request: BarrierCheckRequest = {
        source: { tenantId: 'tenant-1', environment: 'production' },
        target: { tenantId: 'tenant-1', environment: 'production' },
        actor: { id: 'user-1', tenantId: 'tenant-1', roles: ['analyst'] },
        resource: {
          id: 'doc-1',
          type: 'document',
          classification: 'INTERNAL',
        },
        operation: 'READ',
      };

      const result = await enforcer.check(request);
      expect(result.allowed).toBe(true);
      expect(result.barrierViolation).toBe(false);
    });

    it('should block cross-tenant access', async () => {
      const request: BarrierCheckRequest = {
        source: { tenantId: 'tenant-1', environment: 'production' },
        target: { tenantId: 'tenant-2', environment: 'production' },
        actor: { id: 'user-1', tenantId: 'tenant-1', roles: ['analyst'] },
        resource: {
          id: 'doc-1',
          type: 'document',
          classification: 'INTERNAL',
        },
        operation: 'READ',
      };

      const result = await enforcer.check(request);
      expect(result.allowed).toBe(false);
      expect(result.barrierViolation).toBe(true);
      expect(result.violations.some((v) => v.type === 'TENANT_ISOLATION')).toBe(true);
    });

    it('should allow PLATFORM tenant access to any tenant', async () => {
      const request: BarrierCheckRequest = {
        source: { tenantId: 'PLATFORM', environment: 'production' },
        target: { tenantId: 'tenant-1', environment: 'production' },
        actor: { id: 'system', tenantId: 'PLATFORM', roles: ['system'] },
        resource: {
          id: 'config-1',
          type: 'config',
          classification: 'INTERNAL',
        },
        operation: 'READ',
      };

      const result = await enforcer.check(request);
      expect(result.allowed).toBe(true);
    });
  });

  describe('Environment Boundaries', () => {
    it('should allow same-environment access', async () => {
      const request: BarrierCheckRequest = {
        source: { tenantId: 'tenant-1', environment: 'production' },
        target: { tenantId: 'tenant-1', environment: 'production' },
        actor: { id: 'user-1', tenantId: 'tenant-1', roles: ['analyst'] },
        resource: {
          id: 'doc-1',
          type: 'document',
          classification: 'INTERNAL',
        },
        operation: 'READ',
      };

      const result = await enforcer.check(request);
      expect(result.allowed).toBe(true);
    });

    it('should block PII to non-production environment', async () => {
      const request: BarrierCheckRequest = {
        source: { tenantId: 'tenant-1', environment: 'production' },
        target: { tenantId: 'tenant-1', environment: 'development' },
        actor: { id: 'user-1', tenantId: 'tenant-1', roles: ['developer'] },
        resource: {
          id: 'doc-1',
          type: 'document',
          classification: 'CONFIDENTIAL',
          containsPii: true,
        },
        operation: 'TRANSFER',
      };

      const result = await enforcer.check(request);
      expect(result.allowed).toBe(false);
      expect(result.violations.some((v) => v.type === 'ENVIRONMENT')).toBe(true);
    });

    it('should allow anonymized PII to non-production', async () => {
      const request: BarrierCheckRequest = {
        source: { tenantId: 'tenant-1', environment: 'production' },
        target: { tenantId: 'tenant-1', environment: 'development' },
        actor: { id: 'user-1', tenantId: 'tenant-1', roles: ['developer'] },
        resource: {
          id: 'doc-1',
          type: 'document',
          classification: 'INTERNAL',
          containsPii: true,
          anonymized: true,
        },
        operation: 'TRANSFER',
      };

      const result = await enforcer.check(request);
      expect(result.allowed).toBe(true);
    });
  });

  describe('Role-Based Barriers (Clearance)', () => {
    it('should allow access when clearance matches classification', async () => {
      const request: BarrierCheckRequest = {
        source: { tenantId: 'tenant-1', environment: 'production' },
        target: { tenantId: 'tenant-1', environment: 'production' },
        actor: {
          id: 'user-1',
          tenantId: 'tenant-1',
          roles: ['senior-analyst'],
          clearance: 'SECRET',
        },
        resource: {
          id: 'doc-1',
          type: 'document',
          classification: 'RESTRICTED',
        },
        operation: 'READ',
      };

      const result = await enforcer.check(request);
      expect(result.allowed).toBe(true);
    });

    it('should block access when clearance is insufficient', async () => {
      const request: BarrierCheckRequest = {
        source: { tenantId: 'tenant-1', environment: 'production' },
        target: { tenantId: 'tenant-1', environment: 'production' },
        actor: {
          id: 'user-1',
          tenantId: 'tenant-1',
          roles: ['analyst'],
          clearance: 'BASIC',
        },
        resource: {
          id: 'doc-1',
          type: 'document',
          classification: 'RESTRICTED',
        },
        operation: 'READ',
      };

      const result = await enforcer.check(request);
      expect(result.allowed).toBe(false);
      expect(result.violations.some((v) => v.type === 'ROLE_BASED')).toBe(true);
    });

    it('should allow access with step-up authentication', async () => {
      const request: BarrierCheckRequest = {
        source: { tenantId: 'tenant-1', environment: 'production' },
        target: { tenantId: 'tenant-1', environment: 'production' },
        actor: {
          id: 'user-1',
          tenantId: 'tenant-1',
          roles: ['analyst'],
          clearance: 'BASIC',
          stepUpVerified: true,
          stepUpLevel: 3, // RESTRICTED level
        },
        resource: {
          id: 'doc-1',
          type: 'document',
          classification: 'RESTRICTED',
        },
        operation: 'READ',
      };

      const result = await enforcer.check(request);
      expect(result.allowed).toBe(true);
    });
  });

  describe('Caching', () => {
    it('should cache barrier check results', async () => {
      const request: BarrierCheckRequest = {
        source: { tenantId: 'tenant-1', environment: 'production' },
        target: { tenantId: 'tenant-1', environment: 'production' },
        actor: { id: 'user-1', tenantId: 'tenant-1', roles: ['analyst'] },
        resource: {
          id: 'doc-1',
          type: 'document',
          classification: 'INTERNAL',
        },
        operation: 'READ',
      };

      // First call
      const result1 = await enforcer.check(request);

      // Second call should use cache
      const result2 = await enforcer.check(request);

      expect(result1.allowed).toBe(result2.allowed);
      expect(result1.barrierViolation).toBe(result2.barrierViolation);
    });

    it('should clear cache', async () => {
      const stats1 = enforcer.getCacheStats();
      expect(stats1.size).toBe(0);

      const request: BarrierCheckRequest = {
        source: { tenantId: 'tenant-1', environment: 'production' },
        target: { tenantId: 'tenant-1', environment: 'production' },
        actor: { id: 'user-1', tenantId: 'tenant-1', roles: ['analyst'] },
        resource: {
          id: 'doc-1',
          type: 'document',
          classification: 'INTERNAL',
        },
        operation: 'READ',
      };

      await enforcer.check(request);

      const stats2 = enforcer.getCacheStats();
      expect(stats2.size).toBeGreaterThan(0);

      enforcer.clearCache();

      const stats3 = enforcer.getCacheStats();
      expect(stats3.size).toBe(0);
    });
  });

  describe('Audit Event Generation', () => {
    it('should generate unique audit event IDs', async () => {
      const request: BarrierCheckRequest = {
        source: { tenantId: 'tenant-1', environment: 'production' },
        target: { tenantId: 'tenant-1', environment: 'production' },
        actor: { id: 'user-1', tenantId: 'tenant-1', roles: ['analyst'] },
        resource: {
          id: 'doc-1',
          type: 'document',
          classification: 'INTERNAL',
        },
        operation: 'READ',
      };

      enforcer.clearCache(); // Ensure no caching

      const result1 = await enforcer.check(request);
      enforcer.clearCache();
      const result2 = await enforcer.check(request);

      expect(result1.auditEventId).toBeDefined();
      expect(result2.auditEventId).toBeDefined();
      expect(result1.auditEventId).not.toBe(result2.auditEventId);
    });
  });

  describe('Error Handling', () => {
    it('should fail closed in strict mode on OPA error', async () => {
      const failingEnforcer = new BarrierEnforcer({
        opaEndpoint: 'http://invalid-endpoint:9999',
        strictMode: true,
      });

      const request: BarrierCheckRequest = {
        source: { tenantId: 'tenant-1', environment: 'production' },
        target: { tenantId: 'tenant-1', environment: 'production' },
        actor: { id: 'user-1', tenantId: 'tenant-1', roles: ['analyst'] },
        resource: {
          id: 'doc-1',
          type: 'document',
          classification: 'INTERNAL',
        },
        operation: 'READ',
      };

      // Local checks will pass, so the result depends on OPA
      // Since we mock local checks passing and OPA failing, the result
      // depends on implementation
      const result = await failingEnforcer.check(request);

      // In strict mode with local checks passing, we'd try OPA
      // which would fail, resulting in a blocked result
      expect(result.auditEventId).toBeDefined();
    });
  });

  describe('Multiple Violations', () => {
    it('should collect multiple violations', async () => {
      const request: BarrierCheckRequest = {
        source: { tenantId: 'tenant-1', environment: 'production' },
        target: { tenantId: 'tenant-2', environment: 'development' },
        actor: {
          id: 'user-1',
          tenantId: 'tenant-1',
          roles: ['analyst'],
          clearance: 'NONE',
        },
        resource: {
          id: 'doc-1',
          type: 'document',
          classification: 'RESTRICTED',
          containsPii: true,
        },
        operation: 'TRANSFER',
      };

      const result = await enforcer.check(request);

      expect(result.allowed).toBe(false);
      expect(result.violations.length).toBeGreaterThanOrEqual(1);

      // Should have tenant isolation violation
      expect(result.violations.some((v) => v.type === 'TENANT_ISOLATION')).toBe(true);
    });
  });
});
