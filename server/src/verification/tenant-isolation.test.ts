
import { test, describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert';
import { extractTenantContext } from '../security/tenantContext.js';
import { TenantSafePostgres } from '../lib/db/TenantSafePostgres.js';
import { TenantContext } from '../tenancy/types.js';

// Mock Express Request
const mockRequest = (headers: Record<string, string>, auth: any = {}) => ({
  headers,
  auth,
  user: auth // some middlewares use user, some auth
} as any);

describe('Enterprise Isolation Verification', () => {
  const originalEnv = process.env.NODE_ENV;
  const originalStrict = process.env.STRICT_TENANCY;

  after(() => {
    process.env.NODE_ENV = originalEnv;
    if (originalStrict) {
      process.env.STRICT_TENANCY = originalStrict;
    } else {
      delete process.env.STRICT_TENANCY;
    }
  });

  describe('Strict Tenant Context', () => {
    it('should enforce strict environment in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.STRICT_TENANCY = 'true';

      const req = mockRequest({
        'x-tenant-id': 'tenant-1'
        // Missing environment
      });

      assert.throws(() => {
        extractTenantContext(req);
      }, /Tenant environment header is required in strict mode/);
    });

    it('should enforce strict privilege in strict mode', () => {
      process.env.NODE_ENV = 'production';
      process.env.STRICT_TENANCY = 'true';

      const req = mockRequest({
        'x-tenant-id': 'tenant-1',
        'x-tenant-environment': 'prod'
        // Missing privilege
      });

      assert.throws(() => {
        extractTenantContext(req);
      }, /Tenant privilege header is required in strict mode/);
    });

    it('should accept fully qualified context in strict mode', () => {
      process.env.NODE_ENV = 'production';
      process.env.STRICT_TENANCY = 'true';

      const req = mockRequest({
        'x-tenant-id': 'tenant-1',
        'x-tenant-environment': 'prod',
        'x-tenant-privilege-tier': 'standard'
      });

      const context = extractTenantContext(req);
      assert.strictEqual(context?.tenantId, 'tenant-1');
      assert.strictEqual(context?.environment, 'prod');
      assert.strictEqual(context?.privilegeTier, 'standard');
      assert.strictEqual(context?.inferredEnvironment, false);
    });
  });

  describe('TenantSafePostgres', () => {
    // Mock Pool
    const mockPool = {
      query: async (text: string, params: any[]) => ({ rows: [] })
    };

    // We need to spy on the query. Since we can't easily use jest.fn(),
    // we'll implement a simple capture.
    let lastQuery: { text: string, params: any[] } | null = null;
    mockPool.query = async (text: string, params: any[]) => {
      lastQuery = { text, params };
      return { rows: [] };
    };

    const safeDb = new TenantSafePostgres(mockPool as any);
    const context: TenantContext = {
        tenantId: 'tenant-1',
        environment: 'prod',
        privilegeTier: 'standard'
    };

    beforeEach(() => {
      lastQuery = null;
    });

    it('should allow queries with tenant_id clause and param', async () => {
      await safeDb.query(context, 'SELECT * FROM data WHERE tenant_id = $1', ['tenant-1']);
      assert.ok(lastQuery);
      assert.strictEqual(lastQuery.params[0], 'tenant-1');
    });

    it('should reject queries missing tenant_id in SQL', async () => {
      await assert.rejects(async () => {
        await safeDb.query(context, 'SELECT * FROM data', []);
      }, /Unsafe query detected/);
    });

    it('should reject queries with tenant_id in SQL but missing in params', async () => {
       await assert.rejects(async () => {
        // Here we simulate a mismatch: SQL has it, but param doesn't match context
        await safeDb.query(context, 'SELECT * FROM data WHERE tenant_id = $1', ['tenant-2']);
      }, /Tenant ID mismatch/);
    });

    it('should allow system queries (select 1)', async () => {
        await safeDb.query(context, 'SELECT 1', []);
        assert.ok(lastQuery);
    });
  });

  describe('Admin Routes (Logic)', () => {
     // Verify the quota logic directly since we can't easily spin up express here
     // We verified the route calls QuotaConfigService.setTenantPlan

     // Let's verify QuotaConfigService has the method
     it('should have setTenantPlan method on QuotaConfigService', async () => {
         const { quotaConfigService } = await import('../lib/resources/QuotaConfig.js');
         assert.strictEqual(typeof quotaConfigService.setTenantPlan, 'function');
     });
  });
});
