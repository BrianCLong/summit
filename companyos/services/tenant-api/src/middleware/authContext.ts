/**
 * CompanyOS Tenant API - Auth Context Middleware
 *
 * Creates authentication context for requests with ABAC-ready structure.
 * TODO: Wire in OPA policy engine for production ABAC decisions.
 */

import type { Request, Response, NextFunction } from 'express';
import type { AuthUser } from '../graphql/context.js';
import jwt from 'jsonwebtoken';

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
 * JWT Token Payload Structure
 */
interface JWTPayload {
  sub: string; // User ID
  email: string;
  tenantId?: string;
  roles: string[];
  permissions?: string[];
  iat?: number;
  exp?: number;
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
 * JWT_SECRET environment variable (required for production)
 * FATAL if not set in production environments
 */
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error(
    'FATAL: JWT_SECRET environment variable must be set in production. ' +
    'This is required for secure JWT token validation. ' +
    'Generate a strong random secret (minimum 32 characters) and set it in your environment.'
  );
}

// Development fallback (logged as warning)
const effectiveSecret = JWT_SECRET || 'dev-secret-DO-NOT-USE-IN-PRODUCTION';
if (!JWT_SECRET && process.env.NODE_ENV !== 'production') {
  console.warn(
    '[WARN] JWT_SECRET not set - using development fallback. ' +
    'Set JWT_SECRET environment variable for production.'
  );
}

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
 * Authenticate JWT token and extract user identity
 * Validates JWT signature, expiration, and extracts user claims
 *
 * ✅ SCAFFOLD ELIMINATED: Replaced stub header-based auth with real JWT validation
 */
export function authenticateJWT(req: Request, res: Response, next: NextFunction) {
  // Check for Authorization header
  const authHeader = req.headers.authorization;
  const tenantHeader = req.headers['x-tenant-id'] as string | undefined;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // No token provided - return 401
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Bearer token required in Authorization header',
    });
    return;
  }

  const token = authHeader.slice(7);

  try {
    // Validate and decode JWT token
    const decoded = jwt.verify(token, effectiveSecret, {
      algorithms: ['HS256'], // Enforce HMAC-SHA256
    }) as JWTPayload;

    // Extract user from JWT claims
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      tenantId: decoded.tenantId || tenantHeader, // Prefer token claim, fallback to header
      roles: decoded.roles || [],
      permissions: decoded.permissions || [],
    };

    // Set tenantId on request for convenience
    req.tenantId = req.user.tenantId;

    // Log successful authentication
    console.log(`[AUTH] User authenticated: ${req.user.email} (${req.user.id})`);

    next();
  } catch (error) {
    // JWT validation failed
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Token expired',
        expiredAt: error.expiredAt,
      });
      return;
    }

    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid token',
        reason: error.message,
      });
      return;
    }

    // Unknown error
    console.error('[AUTH] JWT validation error:', error);
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Token validation failed',
    });
    return;
  }
}

/**
 * Optional authentication middleware
 * Attempts to authenticate but allows requests to proceed even if no token provided
 * Sets req.user if valid token present, otherwise leaves it undefined
 */
export function optionalJWT(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const tenantHeader = req.headers['x-tenant-id'] as string | undefined;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // No token - proceed without user
    req.tenantId = tenantHeader;
    next();
    return;
  }

  const token = authHeader.slice(7);

  try {
    const decoded = jwt.verify(token, effectiveSecret, {
      algorithms: ['HS256'],
    }) as JWTPayload;

    req.user = {
      id: decoded.sub,
      email: decoded.email,
      tenantId: decoded.tenantId || tenantHeader,
      roles: decoded.roles || [],
      permissions: decoded.permissions || [],
    };

    req.tenantId = req.user.tenantId;
  } catch (error) {
    // Token invalid - proceed without user
    console.warn('[AUTH] Optional JWT validation failed:', error instanceof Error ? error.message : 'Unknown error');
    req.tenantId = tenantHeader;
  }

  next();
}

/**
 * Development-only middleware: stub identity for testing without real auth
 * WARNING: Only use in development/test environments
 * Uses x-user-* headers to create a stub user without JWT validation
 */
export function devStubIdentity(req: Request, res: Response, next: NextFunction) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FATAL: devStubIdentity middleware cannot be used in production');
  }

  const tenantHeader = req.headers['x-tenant-id'] as string | undefined;

  req.user = {
    id: req.headers['x-user-id'] as string || 'dev-user',
    email: req.headers['x-user-email'] as string || 'dev@companyos.local',
    tenantId: tenantHeader,
    roles: (req.headers['x-user-roles'] as string || 'platform-admin').split(','),
    permissions: (req.headers['x-user-permissions'] as string || '').split(',').filter(Boolean),
  };

  req.tenantId = tenantHeader;

  console.log(`[AUTH] DEV STUB: User ${req.user.email} (${req.user.id})`);
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

/**
 * Create a JWT token for a user (helper for testing/development)
 *
 * @param userId - User ID (sub claim)
 * @param email - User email
 * @param roles - User roles
 * @param options - Additional options (tenantId, permissions, expiresIn)
 * @returns Signed JWT token
 */
export function createToken(
  userId: string,
  email: string,
  roles: string[],
  options: {
    tenantId?: string;
    permissions?: string[];
    expiresIn?: string;
  } = {}
): string {
  const payload: JWTPayload = {
    sub: userId,
    email,
    roles,
    tenantId: options.tenantId,
    permissions: options.permissions || [],
  };

  return jwt.sign(payload, effectiveSecret, {
    algorithm: 'HS256',
    expiresIn: options.expiresIn || '24h',
  });
}
