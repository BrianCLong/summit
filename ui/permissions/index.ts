/**
 * Summit UI Permission System
 *
 * Role-based access control for UI surfaces.
 * Roles: viewer < analyst < operator < admin
 */

export type Role = 'viewer' | 'analyst' | 'operator' | 'admin';

export interface Permission {
  resource: string;
  actions: ('read' | 'write' | 'delete' | 'admin')[];
}

export interface UserContext {
  id: string;
  email: string;
  role: Role;
  permissions?: Permission[];
}

/** Role hierarchy — higher number = more access */
const roleLevel: Record<Role, number> = {
  viewer: 0,
  analyst: 1,
  operator: 2,
  admin: 3,
};

/**
 * Check if a user role satisfies the minimum required role.
 */
export function hasRole(userRole: Role, requiredRole: Role): boolean {
  return roleLevel[userRole] >= roleLevel[requiredRole];
}

/**
 * Check if user has specific permission on a resource.
 */
export function hasPermission(user: UserContext, resource: string, action: 'read' | 'write' | 'delete' | 'admin'): boolean {
  // Admin always has access
  if (user.role === 'admin') return true;

  // Check explicit permissions
  if (user.permissions) {
    const perm = user.permissions.find((p) => p.resource === resource);
    if (perm && perm.actions.includes(action)) return true;
  }

  // Role-based defaults
  if (action === 'read' && roleLevel[user.role] >= roleLevel.viewer) return true;
  if (action === 'write' && roleLevel[user.role] >= roleLevel.operator) return true;
  if (action === 'delete' && roleLevel[user.role] >= roleLevel.admin) return true;

  return false;
}

/**
 * Default role-capability mapping.
 * Maps navigation sections to minimum required roles.
 */
export const defaultRolePermissions: Record<string, Role> = {
  dashboard: 'viewer',
  investigations: 'analyst',
  intelgraph: 'viewer',
  repositories: 'viewer',
  architecture: 'analyst',
  agents: 'operator',
  simulations: 'analyst',
  threat: 'analyst',
  datasources: 'analyst',
  experiments: 'analyst',
  governance: 'operator',
  operations: 'operator',
  settings: 'admin',
};
