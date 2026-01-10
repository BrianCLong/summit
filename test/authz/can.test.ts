import { can, AuthorizationContext } from '../../server/src/authz/can';
import { Permission, Role } from '../../server/src/authz/permissions';

describe('authorization helper', () => {
  const tenantContext: AuthorizationContext = {
    role: Role.ADMIN,
    tenantId: 'tenant-a',
    resourceTenantId: 'tenant-a',
  };

  it('denies when the role is missing a permission with a stable error reason', () => {
    const result = can(Permission.WRITE_TENANT_DATA, {
      ...tenantContext,
      role: Role.VIEWER,
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('role_missing_permission');
    expect(result.permission).toBe(Permission.WRITE_TENANT_DATA);
    expect(result.role).toBe(Role.VIEWER);
  });

  it('allows when the role includes the permission', () => {
    const result = can(Permission.WRITE_TENANT_DATA, tenantContext);

    expect(result.allowed).toBe(true);
  });

  it('prevents cross-tenant access even when the role has permission', () => {
    const result = can(Permission.READ_TENANT_DATA, {
      ...tenantContext,
      resourceTenantId: 'tenant-b',
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('cross_tenant_denied');
  });
});
