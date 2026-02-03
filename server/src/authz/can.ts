import { Permission, Role, ROLE_PERMISSIONS } from './permissions.js';

export interface AuthorizationContext {
  role: Role;
  tenantId?: string;
  resourceTenantId?: string;
  environment?: string;
}

export interface AuthorizationResult {
  allowed: boolean;
  reason?: 'role_missing_permission' | 'cross_tenant_denied' | 'unknown_permission';
  permission: Permission;
  role: Role;
}

export function can(
  permission: Permission,
  context: AuthorizationContext
): AuthorizationResult {
  if (!Object.values(Permission).includes(permission)) {
    return {
      allowed: false,
      reason: 'unknown_permission',
      permission,
      role: context.role,
    };
  }

  const permissions = ROLE_PERMISSIONS[context.role] ?? [];
  if (!permissions.includes(permission)) {
    return {
      allowed: false,
      reason: 'role_missing_permission',
      permission,
      role: context.role,
    };
  }

  if (
    context.tenantId &&
    context.resourceTenantId &&
    context.tenantId !== context.resourceTenantId
  ) {
    return {
      allowed: false,
      reason: 'cross_tenant_denied',
      permission,
      role: context.role,
    };
  }

  return {
    allowed: true,
    permission,
    role: context.role,
  };
}
