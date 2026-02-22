/**
 * CompanyOS Tenant API - Auth Context Middleware
 *
 * Creates authentication context for requests with ABAC-ready structure.
 * Integrates with OPA policy engine for production ABAC decisions.
 */

import type { Request, Response, NextFunction } from 'express';
import type { AuthUser } from '../graphql/context.js';

// OPA Configuration
const OPA_URL = process.env.OPA_URL ?? 'http://localhost:8181';
const OPA_TENANT_POLICY_PATH = '/v1/data/companyos/authz/tenant/decision';
const OPA_TIMEOUT_MS = parseInt(process.env.OPA_TIMEOUT_MS ?? '5000', 10);
const OPA_ENABLED = process.env.OPA_ENABLED !== 'false';
const FAIL_CLOSED = process.env.NODE_ENV === 'production';

/**
 * OPA Policy Input for tenant operations
 */
interface OpaTenantInput {
  action: string;
  resource: {
    type: 'tenant';
    tenant_id?: string;
    path: string;
  };
  subject: {
    id: string;
    email: string;
    tenant_id?: string;
    roles: string[];
    permissions: string[];
  };
}

/**
 * OPA Decision Result
 */
interface OpaDecisionResult {
  allow: boolean;
  reason?: string;
  obligations?: string[];
}

/**
 * Evaluate OPA policy for tenant operations
 * Implements fail-closed behavior in production
 */
async function evaluateOpaPolicy(input: OpaTenantInput): Promise<OpaDecisionResult> {
  const opaUrl = `${OPA_URL}${OPA_TENANT_POLICY_PATH}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OPA_TIMEOUT_MS);

  try {
    const res = await fetch(opaUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      logPolicyDecision(input, { allow: false, reason: `opa_http_error_${res.status}` });
      return { allow: false, reason: 'opa_error' };
    }

    const body = (await res.json()) as { result?: OpaDecisionResult };
    const result = body.result ?? { allow: false, reason: 'opa_no_result' };

    logPolicyDecision(input, result);
    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    const errorMessage = error instanceof Error ? error.message : 'unknown error';

    if (process.env.NODE_ENV !== 'test') {
      console.error('[opa] tenant policy evaluation failed:', errorMessage);
    }

    logPolicyDecision(input, { allow: false, reason: `opa_error: ${errorMessage}` });

    // FAIL-CLOSED in production: deny on OPA errors
    if (FAIL_CLOSED) {
      return { allow: false, reason: 'policy_evaluation_failed' };
    }

    // Non-production: indicate OPA unavailable for fallback handling
    return { allow: false, reason: 'opa_unavailable' };
  }
}

/**
 * Log policy decisions for audit trail
 */
function logPolicyDecision(input: OpaTenantInput, result: OpaDecisionResult): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    type: 'policy_decision',
    subject: input.subject.id,
    action: input.action,
    resource: input.resource,
    decision: result.allow ? 'allow' : 'deny',
    reason: result.reason,
    obligations: result.obligations,
  };

  // In production, this should go to a structured logging system / provenance ledger
  if (process.env.NODE_ENV === 'production') {
    console.log(JSON.stringify(logEntry));
  } else if (process.env.LOG_POLICY_DECISIONS === 'true') {
    console.log('[policy]', JSON.stringify(logEntry, null, 2));
  }
}

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
 * Used as fallback when OPA is unavailable in non-production environments
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
 * Uses OPA policy engine in production, with RBAC fallback in development
 */
export async function checkPermission(
  user: AuthUser | undefined,
  action: string,
  resource: string,
  resourceTenantId?: string,
): Promise<AccessDecision> {
  // No user = no access
  if (!user) {
    return {
      allowed: false,
      reason: 'Authentication required',
      resource,
      action,
    };
  }

  // Try OPA evaluation first if enabled
  if (OPA_ENABLED) {
    const opaInput: OpaTenantInput = {
      action,
      resource: {
        type: 'tenant',
        tenant_id: resourceTenantId,
        path: resource,
      },
      subject: {
        id: user.id,
        email: user.email,
        tenant_id: user.tenantId,
        roles: user.roles,
        permissions: user.permissions,
      },
    };

    const opaResult = await evaluateOpaPolicy(opaInput);

    // If OPA returned a decision (not unavailable), use it
    if (opaResult.reason !== 'opa_unavailable') {
      return {
        allowed: opaResult.allow,
        reason: opaResult.reason ?? (opaResult.allow ? 'OPA policy allowed' : 'OPA policy denied'),
        userId: user.id,
        tenantId: user.tenantId,
        resource,
        action,
        obligations: opaResult.obligations,
      };
    }

    // OPA unavailable and we're in production with fail-closed - already denied above
    // If we reach here, OPA is unavailable in non-production, fall through to RBAC
    if (process.env.NODE_ENV !== 'test') {
      console.warn('[authz] OPA unavailable, falling back to RBAC');
    }
  }

  // RBAC Fallback (non-production or OPA unavailable)
  // Platform admins have full access
  if (user.roles.includes('platform-admin')) {
    return {
      allowed: true,
      reason: 'Platform admin access granted (RBAC fallback)',
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
      reason: `Permission denied: missing ${action} (RBAC fallback)`,
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
        reason: 'Cross-tenant access denied (RBAC fallback)',
        userId: user.id,
        tenantId: user.tenantId,
        resource,
        action,
      };
    }
  }

  return {
    allowed: true,
    reason: 'Permission granted (RBAC fallback)',
    userId: user.id,
    tenantId: user.tenantId,
    resource,
    action,
  };
}

/**
 * Require permission middleware factory
 * Evaluates OPA policy and returns 403 if denied
 */
export function requirePermission(action: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const decision = await checkPermission(
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
    } catch (error) {
      // Fail-closed: deny on any unexpected error
      console.error('[authz] Permission check failed:', error);
      res.status(403).json({
        error: 'Forbidden',
        reason: 'Authorization check failed',
        action,
      });
    }
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
    // Note: JWT validation should be handled by API gateway or dedicated auth middleware
    // This extracts user claims from headers set by the auth layer
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
