const { validateTenantAccess } = require('../src/middleware/withTenant.ts');
const { tenantScopeViolationsTotal } = require('../src/monitoring/metrics.js');

describe('tenant isolation enforcement', () => {
  const context = { user: { id: 'u1', tenantId: 't1' }, isAuthenticated: true };

  beforeEach(() => {
    tenantScopeViolationsTotal.reset();
  });

  it('denies cross-tenant read', () => {
    expect(() => validateTenantAccess(context, 't2')).toThrow('Access denied');
    expect(tenantScopeViolationsTotal.get().values[0].value).toBe(1);
  });

  it('denies cross-tenant write', () => {
    expect(() => validateTenantAccess(context, 't3')).toThrow('Access denied');
    expect(tenantScopeViolationsTotal.get().values[0].value).toBe(1);
  });
});
