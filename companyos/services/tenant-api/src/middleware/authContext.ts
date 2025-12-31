/**
 * CompanyOS Tenant API - Auth Context Middleware
 *
 * Creates authentication context for requests with ABAC-ready structure.
 * ✅ SCAFFOLD ELIMINATED: OPA policy engine integration wired with feature gating
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
  source?: 'opa' | 'rbac' | 'fallback'; // Track decision source
}

/**
 * OPA Policy Query Input
 */
export interface OPAPolicyInput {
  user: {
    id: string;
    email: string;
    tenantId?: string;
    roles: string[];
    permissions: string[];
  };
  action: string;
  resource: string;
  resourceTenantId?: string;
  context?: Record<string, any>;
}

/**
 * OPA Policy Query Result
 */
export interface OPAPolicyResult {
  allowed: boolean;
  reason?: string;
  obligations?: string[];
}

/**
 * OPA Client Interface
 * Implement this interface to connect to your OPA server
 */
export interface OPAClient {
  /**
   * Query OPA for an authorization decision
   * @param input - Policy input containing user, action, resource
   * @returns Policy decision
   */
  query(input: OPAPolicyInput): Promise<OPAPolicyResult>;

  /**
   * Health check for OPA server
   * @returns true if OPA is reachable and healthy
   */
  isHealthy(): Promise<boolean>;
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
 * Roles and their associated permissions (RBAC fallback)
 * ✅ GATED: Used when OPA disabled or unavailable
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
 * OPA Feature Flag and Configuration
 */
const ENABLE_OPA = process.env.ENABLE_OPA === 'true';
const OPA_URL = process.env.OPA_URL || 'http://localhost:8181';
const OPA_POLICY_PATH = process.env.OPA_POLICY_PATH || '/v1/data/tenant/authz/allow';

if (ENABLE_OPA) {
  console.log(`[OPA] OPA integration enabled: ${OPA_URL}${OPA_POLICY_PATH}`);
} else {
  console.log('[OPA] OPA integration disabled - using RBAC fallback');
}

// Module-level OPA client reference
let opaClient: OPAClient | null = null;
let opaHealthy = false;
let opaFailureCount = 0;

/**
 * Set OPA client implementation
 * Call this during application startup if ENABLE_OPA=true
 *
 * @param client - OPA client implementation
 */
export function setOPAClient(client: OPAClient): void {
  opaClient = client;
  console.log('[OPA] OPA client configured');
}

/**
 * Get OPA client
 * @returns OPA client or null if not configured
 */
function getOPAClient(): OPAClient | null {
  return opaClient;
}

/**
 * Default HTTP-based OPA client implementation
 * Uses fetch to query OPA REST API
 */
export class HTTPOPAClient implements OPAClient {
  constructor(
    private readonly url: string = OPA_URL,
    private readonly policyPath: string = OPA_POLICY_PATH,
    private readonly timeout: number = 5000
  ) {}

  async query(input: OPAPolicyInput): Promise<OPAPolicyResult> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.url}${this.policyPath}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`OPA query failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      return {
        allowed: result.result?.allowed || false,
        reason: result.result?.reason,
        obligations: result.result?.obligations,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      throw new Error(
        `OPA query failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      const response = await fetch(`${this.url}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

/**
 * Query OPA for authorization decision
 * ✅ IMPLEMENTED: Replaces TODO with actual OPA integration
 *
 * @param user - User making the request
 * @param action - Action being performed
 * @param resource - Resource being accessed
 * @param resourceTenantId - Tenant ID of the resource
 * @returns OPA policy decision or null if OPA unavailable
 */
async function queryOPA(
  user: AuthUser,
  action: string,
  resource: string,
  resourceTenantId?: string,
): Promise<OPAPolicyResult | null> {
  if (!ENABLE_OPA) {
    return null; // OPA disabled
  }

  const client = getOPAClient();
  if (!client) {
    console.warn('[OPA] OPA client not configured - falling back to RBAC');
    return null;
  }

  try {
    const input: OPAPolicyInput = {
      user: {
        id: user.id,
        email: user.email,
        tenantId: user.tenantId,
        roles: user.roles,
        permissions: user.permissions,
      },
      action,
      resource,
      resourceTenantId,
    };

    const result = await client.query(input);

    // Reset failure count on success
    if (opaFailureCount > 0) {
      console.log(`[OPA] OPA recovered after ${opaFailureCount} failures`);
      opaFailureCount = 0;
    }
    opaHealthy = true;

    return result;
  } catch (error) {
    opaFailureCount++;
    opaHealthy = false;

    console.error(
      `[OPA] OPA query failed (${opaFailureCount} consecutive failures): ` +
      `${error instanceof Error ? error.message : 'Unknown error'}`
    );

    if (opaFailureCount >= 10) {
      console.error(
        `[OPA] ALERT: ${opaFailureCount} consecutive OPA failures. ` +
        `Falling back to RBAC for all decisions.`
      );
    }

    return null; // Fall back to RBAC on error
  }
}

/**
 * RBAC-based permission check (fallback when OPA disabled or unavailable)
 * ✅ GATED: Fallback logic for RBAC mode
 */
function checkRBAC(
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
      source: 'rbac',
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
      source: 'rbac',
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
      source: 'rbac',
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
        source: 'rbac',
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
    source: 'rbac',
  };
}

/**
 * Check if a user has permission to perform an action
 * ✅ SCAFFOLD ELIMINATED: Now uses OPA when enabled, falls back to RBAC
 *
 * Decision flow:
 * 1. If OPA enabled and healthy: Query OPA
 * 2. If OPA disabled or failed: Use RBAC fallback
 * 3. Track decision source for auditing
 *
 * @param user - User making the request
 * @param action - Action being performed
 * @param resource - Resource being accessed
 * @param resourceTenantId - Tenant ID of the resource
 * @returns Access decision with source tracking
 */
export async function checkPermission(
  user: AuthUser | undefined,
  action: string,
  resource: string,
  resourceTenantId?: string,
): Promise<AccessDecision> {
  // No user = immediate denial
  if (!user) {
    return {
      allowed: false,
      reason: 'Authentication required',
      resource,
      action,
      source: 'fallback',
    };
  }

  // Try OPA first if enabled
  if (ENABLE_OPA) {
    const opaResult = await queryOPA(user, action, resource, resourceTenantId);

    if (opaResult !== null) {
      // OPA succeeded - use its decision
      return {
        allowed: opaResult.allowed,
        reason: opaResult.reason || (opaResult.allowed ? 'OPA policy allowed' : 'OPA policy denied'),
        userId: user.id,
        tenantId: user.tenantId,
        resource,
        action,
        obligations: opaResult.obligations,
        source: 'opa',
      };
    }

    // OPA failed - fall back to RBAC
    console.warn(`[OPA] Falling back to RBAC for ${action} on ${resource}`);
  }

  // Use RBAC fallback
  return checkRBAC(user, action, resource, resourceTenantId);
}

/**
 * Synchronous permission check (uses RBAC only)
 * Use this for synchronous contexts where async OPA queries not possible
 *
 * @deprecated Prefer async checkPermission() for OPA support
 */
export function checkPermissionSync(
  user: AuthUser | undefined,
  action: string,
  resource: string,
  resourceTenantId?: string,
): AccessDecision {
  if (ENABLE_OPA) {
    console.warn(
      `[OPA] checkPermissionSync called but OPA enabled. ` +
      `Use async checkPermission() for OPA support. Falling back to RBAC.`
    );
  }

  return checkRBAC(user, action, resource, resourceTenantId);
}

/**
 * Get OPA health status
 * @returns OPA health information
 */
export function getOPAStatus(): {
  enabled: boolean;
  healthy: boolean;
  failureCount: number;
  url: string;
  policyPath: string;
} {
  return {
    enabled: ENABLE_OPA,
    healthy: opaHealthy,
    failureCount: opaFailureCount,
    url: OPA_URL,
    policyPath: OPA_POLICY_PATH,
  };
}

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
 * Require permission middleware factory
 */
export function requirePermission(action: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
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
