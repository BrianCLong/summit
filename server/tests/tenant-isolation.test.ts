import { requireTenant, addTenantFilter } from '../src/middleware/withTenant';

describe('Tenant Isolation Utilities', () => {
  describe('requireTenant', () => {
    it('returns tenant when present in context', () => {
      const context = { user: { id: 'u1', tenant: 'tenant-a' } } as any;
      expect(requireTenant(context)).toBe('tenant-a');
    });

    it('throws when user is missing', () => {
      const context = {} as any;
      expect(() => requireTenant(context)).toThrow('Authentication required');
    });

    it('throws when tenant is missing', () => {
      const context = { user: { id: 'u1' } } as any;
      expect(() => requireTenant(context)).toThrow('Missing tenant context');
    });
  });

  describe('addTenantFilter', () => {
    it('adds WHERE clause when missing', () => {
      const result = addTenantFilter('MATCH (n:Node) RETURN n', {}, 't1');
      expect(result.cypher).toContain('WHERE n.tenantId = $tenantId');
      expect(result.params).toEqual({ tenantId: 't1' });
    });

    it('adds AND clause when WHERE exists', () => {
      const result = addTenantFilter('MATCH (n:Node) WHERE n.active = true RETURN n', {}, 't1');
      expect(result.cypher).toContain('AND n.tenantId = $tenantId');
      expect(result.params).toEqual({ tenantId: 't1' });
    });
  });
});
