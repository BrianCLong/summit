export enum Role {
  VIEWER = 'VIEWER',
  ANALYST = 'ANALYST',
  OPERATOR = 'OPERATOR',
  ADMIN = 'ADMIN',
}

export enum Permission {
  RECEIPT_INGEST = 'receipt:ingest',
  PLUGIN_PUBLISH = 'plugin:publish',
  POLICY_OVERRIDE = 'policy:override',
  ADMIN_CONFIG = 'admin:config',
}

export interface AuthorizationContext {
  role?: Role;
  permissions?: string[];
  userId?: string;
  tenantId?: string;
}

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.VIEWER]: [],
  [Role.ANALYST]: [Permission.RECEIPT_INGEST],
  [Role.OPERATOR]: [Permission.RECEIPT_INGEST, Permission.PLUGIN_PUBLISH],
  [Role.ADMIN]: [
    Permission.RECEIPT_INGEST,
    Permission.PLUGIN_PUBLISH,
    Permission.POLICY_OVERRIDE,
    Permission.ADMIN_CONFIG,
  ],
};

export function normalizeRole(value?: string | null): Role | undefined {
  if (!value) return undefined;
  const normalized = String(value).trim().toUpperCase();
  return (Role as any)[normalized] as Role | undefined;
}

export function can(
  permission: Permission,
  context: AuthorizationContext = {},
): boolean {
  if (context.permissions?.includes(permission)) {
    return true;
  }

  if (!context.role) {
    return false;
  }

  return ROLE_PERMISSIONS[context.role]?.includes(permission) ?? false;
}

export const rolePermissionsMatrix = ROLE_PERMISSIONS;
