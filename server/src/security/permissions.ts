import type { Request } from 'express';

export const PERMISSIONS = {
  READ_GRAPH: 'read_graph',
  WRITE_GRAPH: 'write_graph',
  RUN_MAESTRO: 'run_maestro',
  VIEW_DASHBOARDS: 'view_dashboards',
  MANAGE_USERS: 'manage_users',
  MANAGE_SETTINGS: 'manage_settings',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS] | string;
export type Role = 'ADMIN' | 'ANALYST' | 'OPERATOR' | 'SERVICE_ACCOUNT' | 'VIEWER';

export const PERMISSION_ALIASES: Record<string, Permission> = {
  'graph:read': PERMISSIONS.READ_GRAPH,
  'graph:export': PERMISSIONS.READ_GRAPH,
  'entity:create': PERMISSIONS.WRITE_GRAPH,
  'entity:update': PERMISSIONS.WRITE_GRAPH,
  'entity:delete': PERMISSIONS.WRITE_GRAPH,
  'relationship:create': PERMISSIONS.WRITE_GRAPH,
  'relationship:update': PERMISSIONS.WRITE_GRAPH,
  'relationship:delete': PERMISSIONS.WRITE_GRAPH,
  'investigation:create': PERMISSIONS.WRITE_GRAPH,
  'investigation:update': PERMISSIONS.WRITE_GRAPH,
  'investigation:read': PERMISSIONS.READ_GRAPH,
  'tag:create': PERMISSIONS.WRITE_GRAPH,
  'tag:read': PERMISSIONS.READ_GRAPH,
  'tag:delete': PERMISSIONS.WRITE_GRAPH,
  'run:create': PERMISSIONS.RUN_MAESTRO,
  'run:read': PERMISSIONS.RUN_MAESTRO,
  'run:update': PERMISSIONS.RUN_MAESTRO,
  'pipeline:create': PERMISSIONS.RUN_MAESTRO,
  'pipeline:update': PERMISSIONS.RUN_MAESTRO,
  'pipeline:read': PERMISSIONS.RUN_MAESTRO,
  'routing:override': PERMISSIONS.RUN_MAESTRO,
  'dashboard:read': PERMISSIONS.VIEW_DASHBOARDS,
  'admin:access': PERMISSIONS.MANAGE_USERS,
  'admin:*': PERMISSIONS.MANAGE_USERS,
  'override:manage': PERMISSIONS.MANAGE_SETTINGS,
};

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  ADMIN: ['*'],
  ANALYST: [
    PERMISSIONS.READ_GRAPH,
    PERMISSIONS.WRITE_GRAPH,
    PERMISSIONS.VIEW_DASHBOARDS,
    'investigation:create',
    'investigation:read',
    'investigation:update',
    'entity:create',
    'entity:read',
    'entity:update',
    'entity:delete',
    'relationship:create',
    'relationship:read',
    'relationship:update',
    'relationship:delete',
    'tag:create',
    'tag:read',
    'tag:delete',
    'graph:read',
    'graph:export',
    'ai:request',
  ],
  OPERATOR: [
    PERMISSIONS.READ_GRAPH,
    PERMISSIONS.RUN_MAESTRO,
    PERMISSIONS.VIEW_DASHBOARDS,
    PERMISSIONS.MANAGE_SETTINGS,
  ],
  SERVICE_ACCOUNT: [PERMISSIONS.READ_GRAPH, PERMISSIONS.WRITE_GRAPH],
  VIEWER: [PERMISSIONS.READ_GRAPH, 'graph:read', 'graph:export', 'investigation:read'],
};

export function normalizePermission(permission: Permission): Permission | null {
  if (!permission) return null;
  const lower = permission.toString().toLowerCase();

  const canonical = Object.values(PERMISSIONS).find((candidate) => candidate === lower);
  if (canonical) return canonical;

  const alias = PERMISSION_ALIASES[permission] || PERMISSION_ALIASES[lower];
  if (alias) return alias;

  return permission;
}

export function permissionsForRole(role?: string | null): Permission[] {
  if (!role) return [];
  const normalizedRole = role.toUpperCase() as Role;
  return ROLE_PERMISSIONS[normalizedRole] || [];
}

export function userHasPermission(
  user: { role?: string; permissions?: Permission[] } | null | undefined,
  permission: Permission,
): boolean {
  if (!user || !user.role) return false;
  const normalizedPermission = normalizePermission(permission);
  const normalizedRole = user.role.toUpperCase();

  if (normalizedRole === 'ADMIN') return true;
  if (!normalizedPermission) return false;

  if (user.permissions?.includes('*')) return true;

  const userExplicitPermissions = (user.permissions || [])
    .map((perm) => normalizePermission(perm))
    .filter(Boolean) as Permission[];

  if (userExplicitPermissions.includes(normalizedPermission)) return true;

  const rolePermissions = permissionsForRole(user.role);
  return rolePermissions.includes('*') || rolePermissions.includes(normalizedPermission);
}

export type AuthenticatedRequest = Request & { user?: { role?: string; permissions?: Permission[] } };
