
import { jest } from '@jest/globals';
import { TenantSentinel } from '../../src/tenant-guard/TenantSentinel';

describe('Tenant Isolation Tests', () => {
  beforeAll(() => {
    // Ensure sentinel is enabled for these tests
    TenantSentinel.setEnabled(true);
  });

  afterAll(() => {
    // Reset to default
    TenantSentinel.setEnabled(process.env.NODE_ENV === 'test');
  });

  describe('TenantSentinel', () => {
    it('should throw when tenantId is missing in input', () => {
      const input = { data: 'some data' }; // Missing tenantId
      expect(() => {
        TenantSentinel.assertTenant(input, 'TestOperation');
      }).toThrowError(/Tenant Leak Detected/);
    });

    it('should pass when tenantId is present', () => {
      const input = { tenantId: 'tenant-123', data: 'some data' };
      expect(() => {
        TenantSentinel.assertTenant(input, 'TestOperation');
      }).not.toThrow();
    });

    it('should throw when result contains data from wrong tenant', () => {
      const result = { id: '1', tenantId: 'tenant-456' };
      const expectedTenant = 'tenant-123';

      expect(() => {
        TenantSentinel.assertResult(result, expectedTenant, 'TestQuery');
      }).toThrowError(/Cross-Tenant Data Leak/);
    });

    it('should pass when result matches tenant', () => {
      const result = { id: '1', tenantId: 'tenant-123' };
      const expectedTenant = 'tenant-123';

      expect(() => {
        TenantSentinel.assertResult(result, expectedTenant, 'TestQuery');
      }).not.toThrow();
    });

    it('should handle array results correctly', () => {
      const results = [
        { id: '1', tenantId: 'tenant-123' },
        { id: '2', tenantId: 'tenant-456' } // Leak!
      ];
      const expectedTenant = 'tenant-123';

      expect(() => {
        TenantSentinel.assertResult(results, expectedTenant, 'TestQueryArray');
      }).toThrowError(/Cross-Tenant Data Leak/);
    });
  });

  describe('Integration Simulation', () => {
    // Simulating a Data Access Layer that uses the Sentinel
    class MockDAL {
      private db = [
        { id: '1', tenantId: 'tenant-A', value: 'secret-A' },
        { id: '2', tenantId: 'tenant-B', value: 'secret-B' }
      ];

      async getById(id: string, context: { tenantId: string }) {
        TenantSentinel.assertTenant(context, 'MockDAL.getById');

        // Simulating a query. A buggy implementation might ignore tenantId.
        const result = this.db.find(item => item.id === id);

        // The sentinel should catch if we return something not belonging to tenant
        TenantSentinel.assertResult(result, context.tenantId, 'MockDAL.getById');

        return result;
      }

      async buggyGetById(id: string, context: { tenantId: string }) {
        // This method intentionally skips input validation and output filtering
        // But if we wrap the output check, we should still catch it.
        TenantSentinel.assertTenant(context, 'MockDAL.buggyGetById');

        const result = this.db.find(item => item.id === id); // Ignores tenant filter in "query"

        TenantSentinel.assertResult(result, context.tenantId, 'MockDAL.buggyGetById');

        return result;
      }
    }

    const dal = new MockDAL();

    it('should allow valid access', async () => {
      const result = await dal.getById('1', { tenantId: 'tenant-A' });
      expect(result).toBeDefined();
      expect(result?.value).toBe('secret-A');
    });

    it('should detect cross-tenant leak in buggy implementation', async () => {
      // User from tenant-A tries to access ID 2 (which belongs to tenant-B)
      // The buggy implementation finds it by ID, but Sentinel checks the result.
      await expect(dal.buggyGetById('2', { tenantId: 'tenant-A' }))
        .rejects.toThrowError(/Cross-Tenant Data Leak/);
    });

    it('should enforce tenant context requirement', async () => {
      // @ts-ignore
      await expect(dal.getById('1', {}))
        .rejects.toThrowError(/Tenant Leak Detected/);
    });
  });
});
