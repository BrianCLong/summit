export enum Role {
  SUPERADMIN = 'superadmin',
  ADMIN = 'admin',
  ANALYST = 'analyst',
  VIEWER = 'viewer',
}

export enum Permission {
  MANAGE_USERS = 'manage_users',
  READ_TENANT_DATA = 'read_tenant_data',
  WRITE_TENANT_DATA = 'write_tenant_data',
  EXECUTE_DANGEROUS_ACTION = 'execute_dangerous_action',
}

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.SUPERADMIN]: [
    Permission.MANAGE_USERS,
    Permission.READ_TENANT_DATA,
    Permission.WRITE_TENANT_DATA,
    Permission.EXECUTE_DANGEROUS_ACTION,
  ],
  [Role.ADMIN]: [
    Permission.MANAGE_USERS,
    Permission.READ_TENANT_DATA,
    Permission.WRITE_TENANT_DATA,
    Permission.EXECUTE_DANGEROUS_ACTION,
  ],
  [Role.ANALYST]: [Permission.READ_TENANT_DATA],
  [Role.VIEWER]: [Permission.READ_TENANT_DATA],
};

export const permissionLabels: Record<Permission, string> = {
  [Permission.MANAGE_USERS]: 'Manage users and roles',
  [Permission.READ_TENANT_DATA]: 'Read tenant-scoped data',
  [Permission.WRITE_TENANT_DATA]: 'Write tenant-scoped data',
  [Permission.EXECUTE_DANGEROUS_ACTION]: 'Execute dangerous or step-up actions',
};

export function permissionsForRole(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}
