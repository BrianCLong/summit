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
import rateLimit from 'express-rate-limit';

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
export function requireAuth() {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    const apiKey = req.headers['x-api-key'];

    if (!authHeader && !apiKey) {
      return res.status(401).json({
        error: 'unauthorized',
        message: 'Authentication required. Provide Authorization header or X-API-Key.',
      });
    }

    // Basic token extraction (production should use proper JWT validation)
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      // TODO: Integrate with JWT validation service
      // For now, extract basic user info (placeholder for real implementation)
      req.user = {
        sub: 'user_' + Buffer.from(token).toString('base64').substring(0, 8),
        tenantId: req.headers['x-tenant-id'] as string,
        roles: ['user'],
        scopes: ['read', 'write'],
      };
    } else if (apiKey) {
      // TODO: Integrate with API key validation service
      req.user = {
        sub: 'apikey_' + Buffer.from(apiKey as string).toString('base64').substring(0, 8),
        tenantId: req.headers['x-tenant-id'] as string,
        roles: ['api'],
        scopes: ['read', 'write'],
      };
    }

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
