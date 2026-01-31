import { Principal, RoleKey } from './types.js';

export type Permission =
  | 'runs.read' | 'runs.write'
  | 'tasks.read' | 'tasks.write'
  | 'graph.analysis.read' | 'graph.analysis.run'
  | 'notifications.manage'
  | 'webhooks.manage'
  | 'audit.read'
  | 'config.manage'
  | 'tenant.admin'
  | 'admin.access' // Legacy super-admin
  | '*';           // Wildcard

/**
 * Role to Permission Mapping
 */
const ROLE_PERMISSIONS: Record<RoleKey, Permission[]> = {
  'tenant.admin': ['*'],
  'tenant.developer': [
    'runs.read', 'runs.write',
    'tasks.read', 'tasks.write',
    'graph.analysis.read', 'graph.analysis.run',
    'notifications.manage', 'webhooks.manage',
    'audit.read'
  ],
  'tenant.viewer': [
    'runs.read',
    'tasks.read',
    'graph.analysis.read',
    'audit.read'
  ],
  'ops.sre': ['*'], // Simplified for now
  'ops.security': ['audit.read', 'graph.analysis.read'],
  'system.internal': ['*'],

  // Legacy mappings
  'ADMIN': ['*'],
  'ANALYST': [
    'runs.read', 'runs.write',
    'tasks.read', 'tasks.write',
    'graph.analysis.read', 'graph.analysis.run',
    'audit.read'
  ],
  'VIEWER': [
    'runs.read',
    'tasks.read',
    'graph.analysis.read'
  ]
};

export interface PermissionCheckContext {
  principal: Principal;
  resourceTenantId?: string;
}

export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

/**
 * Check if a principal has a specific permission.
 */
export function hasPermission(principal: Principal, permission: Permission): boolean {
  if (!principal) return false;

  // System super-user bypass
  if (principal.isSystem && principal.roles.includes('system.internal')) return true;

  // Check explicit scopes first (e.g. from API Key)
  if (principal.scopes && (principal.scopes.includes(permission) || principal.scopes.includes('*'))) {
    return true;
  }

  // Check roles
  for (const role of principal.roles) {
    const rolePerms = ROLE_PERMISSIONS[role];
    if (rolePerms) {
      if (rolePerms.includes('*')) return true;
      if (rolePerms.includes(permission)) return true;
    }
  }

  return false;
}

/**
 * Assert that a principal can perform an action.
 * Throws AuthorizationError if not allowed.
 *
 * Also enforces tenant isolation if resourceTenantId is provided.
 */
export function assertCan(
  permission: Permission,
  ctx: PermissionCheckContext
): void {
  const { principal, resourceTenantId } = ctx;

  if (!principal) {
    throw new AuthorizationError('Unauthenticated');
  }

  // 1. Tenant Boundary Check
  if (resourceTenantId) {
    if (principal.tenantId !== resourceTenantId) {
      // Allow cross-tenant access only for specific Ops/System roles if needed,
      // but for now strict isolation is safer.
      if (!principal.isSystem && !principal.roles.includes('ops.sre')) {
         throw new AuthorizationError(`Access denied to tenant ${resourceTenantId}`);
      }
    }
  }

  // 2. Permission Check
  if (!hasPermission(principal, permission)) {
    throw new AuthorizationError(`Missing permission: ${permission}`);
  }
}
