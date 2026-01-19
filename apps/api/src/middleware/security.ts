/**
 * Security Middleware
 *
 * Comprehensive security controls for API routes including:
 * - Authentication enforcement
 * - Tenant isolation validation
 * - Rate limiting
 * - Security headers
 */

import type { Request, Response, NextFunction } from 'express';
import { RBACManager } from '../../../../packages/authentication/src/rbac/rbac-manager.js';

type RateLimitOptions = {
  windowMs?: number;
  max?: number;
  message?: any;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
  skip?: (req: Request) => boolean;
};

const rateLimitMap = new Map<string, number[]>();

// Periodic cleanup to avoid memory leak of inactive IPs
setInterval(() => {
  const now = Date.now();
  const maxAge = 60 * 60 * 1000; // 1 hour
  for (const [ip, timestamps] of rateLimitMap.entries()) {
    if (timestamps.length === 0 || now - timestamps[timestamps.length - 1] > maxAge) {
      rateLimitMap.delete(ip);
    }
  }
}, 30 * 60 * 1000).unref(); // Run every 30 minutes

/**
 * Functional in-memory sliding window rate limiter
 * Replaces previous stub to address CN-008
 */
function rateLimit(options: RateLimitOptions) {
  const { windowMs = 15 * 60 * 1000, max = 100, message } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    if (options.skip?.(req)) {
      return next();
    }

    const ip = (req.headers['x-forwarded-for'] as string) || req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    let timestamps = rateLimitMap.get(ip) || [];

    // Filter out timestamps outside the current window
    const windowStart = now - windowMs;
    timestamps = timestamps.filter((t) => t > windowStart);

    if (timestamps.length >= max) {
      // Set Retry-After header
      const oldestTimestamp = timestamps[0];
      const resetTime = Math.ceil((oldestTimestamp + windowMs - now) / 1000);
      res.setHeader('Retry-After', resetTime);

      return res.status(429).json(
        message || {
          error: 'too_many_requests',
          message: 'Too many requests, please try again later',
        },
      );
    }

    timestamps.push(now);
    rateLimitMap.set(ip, timestamps);

    if (options.standardHeaders) {
      res.setHeader('RateLimit-Limit', max);
      res.setHeader('RateLimit-Remaining', Math.max(0, max - timestamps.length));
      res.setHeader('RateLimit-Reset', Math.ceil((timestamps[0] + windowMs) / 1000));
    }

    return next();
  };
}

export interface AuthenticatedRequest extends Request {
  user?: {
    sub: string;
    tenantId?: string;
    roles?: string[];
    scopes?: string[];
  };
  tenantId?: string;
}

/**
 * Basic authentication middleware
 * In production, this should integrate with JWT/OAuth/WebAuthn
 *
 * For MVP-4-GA: Requires Authorization header or API key
 */
/**
 * Hardened authentication middleware
 * Addresses CN-001 and stops trusting client-provided X-Roles header
 *
 * In production, this should integrate with proper JWT/OAuth/WebAuthn providers
 */
export function requireAuth(rbacManager?: RBACManager) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    const apiKey = req.headers['x-api-key'];
    const tenantId = req.headers['x-tenant-id'] as string | undefined;
    const actorTenantId = (req.headers['x-actor-tenant-id'] as string | undefined) ?? tenantId;

    // SECURITY: Get expected secrets from environment
    const isProd = process.env.NODE_ENV === 'production';
    const expectedApiKey = process.env.SUMMIT_API_KEY;
    const expectedBearerToken = process.env.SUMMIT_BEARER_TOKEN;

    // Fail safe: If no secrets are configured in production, deny all
    if (isProd && !expectedApiKey && !expectedBearerToken) {
      return res.status(500).json({
        error: 'configuration_error',
        message: 'Security credentials not configured for production environment',
      });
    }

    // Fallback to dev keys only in non-production
    const apiKeyToValidate = expectedApiKey || (isProd ? null : 'dev-key-12345');
    const tokenToValidate = expectedBearerToken || (isProd ? null : 'dev-token-67890');

    if (!authHeader && !apiKey) {
      return res.status(401).json({
        error: 'unauthorized',
        message: 'Authentication required. Provide Authorization header or X-API-Key.',
      });
    }

    // Validate credentials
    let isAuthenticated = false;
    let subject = '';
    let type: 'user' | 'apikey' = 'user';

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      if (tokenToValidate && token === tokenToValidate) {
        isAuthenticated = true;
        // Restore dynamic subject ID for better audit granularity
        subject = 'user_' + Buffer.from(token).toString('base64').substring(0, 8);
        type = 'user';
      }
    } else if (apiKey) {
      if (apiKeyToValidate && apiKey === apiKeyToValidate) {
        isAuthenticated = true;
        subject = 'apikey_' + Buffer.from(apiKey as string).toString('base64').substring(0, 8);
        type = 'apikey';
      }
    }

    if (!isAuthenticated) {
      return res.status(401).json({
        error: 'invalid_credentials',
        message: 'The provided credentials are invalid',
      });
    }

    if (!tenantId) {
      return res.status(400).json({
        error: 'tenant_context_required',
        message: 'X-Tenant-ID header is required for authenticated requests',
      });
    }

    // SECURITY: Resolve roles based on authenticated subject, NOT client headers
    // This fixes a critical vulnerability where users could escalate privileges via X-Roles
    const resolvedRoles = type === 'user' ? ['admin', 'api_user'] : ['api_user', 'action_operator'];

    req.user = {
      sub: subject,
      tenantId: actorTenantId,
      roles: resolvedRoles,
      scopes: ['read', 'write'],
    };

    // Ensure roles are registered in the RBAC manager
    resolvedRoles.forEach((role) => {
      if (req.user) {
        rbacManager?.assignRole(req.user.sub, role);
      }
    });

    req.tenantId = tenantId;

    next();
  };
}

/**
 * Tenant isolation middleware
 *
 * Enforces that all requests include and validate tenant context
 * Prevents cross-tenant data access
 */
export function requireTenantIsolation() {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const tenantId = req.headers['x-tenant-id'] as string;

    if (!tenantId) {
      return res.status(400).json({
        error: 'missing_tenant_id',
        message: 'X-Tenant-ID header is required for multi-tenant operations',
      });
    }

    // Validate tenant ID format (basic validation)
    if (!/^[a-zA-Z0-9_-]+$/.test(tenantId)) {
      return res.status(400).json({
        error: 'invalid_tenant_id',
        message: 'Tenant ID must be alphanumeric with dashes/underscores',
      });
    }

    // Store validated tenant ID on request
    req.tenantId = tenantId;

    // Validate that user has access to this tenant
    if (req.user && req.user.tenantId && req.user.tenantId !== tenantId) {
      return res.status(403).json({
        error: 'tenant_access_denied',
        message: 'User does not have access to the specified tenant',
      });
    }

    // Add tenant context to user if not present
    if (req.user && !req.user.tenantId) {
      req.user.tenantId = tenantId;
    }

    next();
  };
}

export function requirePermission(
  rbacManager: RBACManager,
  resource: string,
  action: string,
) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'unauthorized', message: 'Authentication required' });
    }

    const allowed = rbacManager.hasPermission(req.user.sub, resource, action);

    if (!allowed) {
      return res.status(403).json({
        error: 'forbidden',
        message: `Insufficient permission for ${resource}:${action}`,
      });
    }

    return next();
  };
}

/**
 * Rate limiting middleware
 *
 * Protects against abuse and DoS attacks
 * Configured per-IP with reasonable limits
 */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'too_many_requests',
    message: 'Too many requests from this IP, please try again later',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Skip rate limiting for health checks
  skip: (req) => req.path === '/health',
});

/**
 * Stricter rate limiting for privileged operations
 *
 * Applied to preflight/execute and other sensitive endpoints
 */
export const privilegedRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 privileged requests per windowMs
  message: {
    error: 'too_many_requests',
    message: 'Too many privileged operations from this IP, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Security headers middleware
 *
 * Adds standard security headers to all responses
 */
export function securityHeaders() {
  return (_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.removeHeader('X-Powered-By');
    next();
  };
}
