import { describe, it, expect } from '@jest/globals';
import { Role, Permission, permissionsForRole } from '../permissions.js';

describe('RBAC Lock', () => {
  it('should enforce least privilege for VIEWER role', () => {
    const permissions = permissionsForRole(Role.VIEWER);
    expect(permissions).toContain(Permission.READ_TENANT_DATA);
    expect(permissions).not.toContain(Permission.WRITE_TENANT_DATA);
    expect(permissions).not.toContain(Permission.MANAGE_USERS);
    expect(permissions).not.toContain(Permission.EXECUTE_DANGEROUS_ACTION);
  });

  it('should enforce least privilege for ANALYST role', () => {
    const permissions = permissionsForRole(Role.ANALYST);
    expect(permissions).toContain(Permission.READ_TENANT_DATA);
    // Analysts should NOT verify write permissions by default unless specified
    expect(permissions).not.toContain(Permission.WRITE_TENANT_DATA);
    expect(permissions).not.toContain(Permission.MANAGE_USERS);
  });

  it('should grant full privileges to SUPERADMIN', () => {
    const permissions = permissionsForRole(Role.SUPERADMIN);
    expect(permissions).toContain(Permission.MANAGE_USERS);
    expect(permissions).toContain(Permission.READ_TENANT_DATA);
    expect(permissions).toContain(Permission.WRITE_TENANT_DATA);
    expect(permissions).toContain(Permission.EXECUTE_DANGEROUS_ACTION);
  });

  it('should lock down critical permissions to explicit roles', () => {
    // Ensure only specific roles have critical permissions
    const roles = Object.values(Role) as Role[];

    const rolesWithManageUsers = roles.filter(role =>
      permissionsForRole(role).includes(Permission.MANAGE_USERS)
    );

    // Explicit allow list for MANAGE_USERS
    const allowedManageUsers = [Role.SUPERADMIN, Role.ADMIN];

    expect(rolesWithManageUsers.sort()).toEqual(allowedManageUsers.sort());

    const rolesWithDangerousAction = roles.filter(role =>
      permissionsForRole(role).includes(Permission.EXECUTE_DANGEROUS_ACTION)
    );

    // Explicit allow list for EXECUTE_DANGEROUS_ACTION
    const allowedDangerous = [Role.SUPERADMIN, Role.ADMIN];
    expect(rolesWithDangerousAction.sort()).toEqual(allowedDangerous.sort());
  });
});
