/**
 * CompanyOS Tenant API - Auth Context Middleware
 *
 * Creates authentication context for requests with ABAC-ready structure.
 * TODO: Wire in OPA policy engine for production ABAC decisions.
 */

import type { Request, Response, NextFunction } from 'express';
import type { AuthUser } from '../graphql/context.js';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      tenantId?: string;
    }
  }
}

/**
 * ABAC Permission Check Result
 */
export interface AccessDecision {
  allowed: boolean;
  reason: string;
  tenantId?: string;
  userId?: string;
  resource: string;
  action: string;
  obligations?: string[];
}

/**
 * ABAC Actions for tenant operations
 */
export const TenantActions = {
  CREATE: 'tenant:create',
  READ: 'tenant:read',
  UPDATE: 'tenant:update',
  DELETE: 'tenant:delete',
  LIST: 'tenant:list',
  MANAGE_FEATURES: 'tenant:manage_features',
  VIEW_AUDIT: 'tenant:view_audit',
} as const;

/**
 * Roles and their associated permissions
 * TODO: Replace with OPA policy evaluation in production
 */
const ROLE_PERMISSIONS: Record<string, string[]> = {
  'platform-admin': [
    TenantActions.CREATE,
    TenantActions.READ,
    TenantActions.UPDATE,
    TenantActions.DELETE,
    TenantActions.LIST,
    TenantActions.MANAGE_FEATURES,
    TenantActions.VIEW_AUDIT,
  ],
  'tenant-admin': [
    TenantActions.READ,
    TenantActions.UPDATE,
    TenantActions.VIEW_AUDIT,
  ],
  'tenant-viewer': [TenantActions.READ],
};

/**
 * Check if a user has permission to perform an action
 * TODO: Replace with OPA policy decision point
 */
export function checkPermission(
  user: AuthUser | undefined,
  action: string,
  resource: string,
  resourceTenantId?: string,
): AccessDecision {
  // No user = no access
  if (!user) {
    return {
      allowed: false,
      reason: 'Authentication required',
      resource,
      action,
    };
  }

  // Platform admins have full access
  if (user.roles.includes('platform-admin')) {
    return {
      allowed: true,
      reason: 'Platform admin access granted',
      userId: user.id,
      resource,
      action,
    };
  }

  // Check role-based permissions
  const userPermissions = new Set(user.permissions);
  for (const role of user.roles) {
    const rolePerms = ROLE_PERMISSIONS[role] || [];
    for (const perm of rolePerms) {
      userPermissions.add(perm);
    }
  }

  if (!userPermissions.has(action)) {
    return {
      allowed: false,
      reason: `Permission denied: missing ${action}`,
      userId: user.id,
      resource,
      action,
    };
  }

  // Tenant isolation check
  if (resourceTenantId && user.tenantId && user.tenantId !== resourceTenantId) {
    // Cross-tenant access requires explicit permission
    if (!user.permissions.includes('cross-tenant:access')) {
      return {
        allowed: false,
        reason: 'Cross-tenant access denied',
        userId: user.id,
        tenantId: user.tenantId,
        resource,
        action,
      };
    }
  }

  return {
    allowed: true,
    reason: 'Permission granted',
    userId: user.id,
    tenantId: user.tenantId,
    resource,
    action,
  };
}

/**
 * Require permission middleware factory
 */
export function requirePermission(action: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const decision = checkPermission(
      req.user,
      action,
      req.path,
      req.params.tenantId,
    );

    if (!decision.allowed) {
      res.status(403).json({
        error: 'Forbidden',
        reason: decision.reason,
        action: decision.action,
      });
      return;
    }

    next();
  };
}

/**
 * Stub identity middleware for development
 * Extracts user from JWT or creates a stub user
 */
export function stubIdentity(req: Request, res: Response, next: NextFunction) {
  // Check for Authorization header
  const authHeader = req.headers.authorization;
  const tenantHeader = req.headers['x-tenant-id'] as string | undefined;

  if (authHeader?.startsWith('Bearer ')) {
    // TODO: Validate JWT token and extract user
    // For now, create a stub user based on headers
    const token = authHeader.slice(7);

    // In production, decode and validate JWT
    // For development, use stub data
    req.user = {
      id: req.headers['x-user-id'] as string || 'dev-user',
      email: req.headers['x-user-email'] as string || 'dev@companyos.local',
      tenantId: tenantHeader,
      roles: (req.headers['x-user-roles'] as string || 'platform-admin').split(','),
      permissions: [],
    };
  } else {
    // Development mode: auto-create platform admin
    if (process.env.NODE_ENV !== 'production') {
      req.user = {
        id: 'dev-admin',
        email: 'admin@companyos.local',
        tenantId: tenantHeader,
        roles: ['platform-admin'],
        permissions: [],
      };
    }
  }

  req.tenantId = tenantHeader;
  next();
}

/**
 * Validate tenant ID format
 */
export function validateTenantId(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const tenantId = req.params.tenantId || req.headers['x-tenant-id'];

  if (tenantId && typeof tenantId === 'string') {
    // Validate format: alphanumeric, hyphens, underscores only
    if (!/^[a-zA-Z0-9_-]+$/.test(tenantId)) {
      res.status(400).json({
        error: 'Invalid tenant ID format',
        message: 'Tenant ID must contain only alphanumeric characters, hyphens, and underscores',
      });
      return;
    }

    // Length validation
    if (tenantId.length > 100) {
      res.status(400).json({
        error: 'Invalid tenant ID',
        message: 'Tenant ID must be 100 characters or less',
      });
      return;
    }
  }

  next();
}
