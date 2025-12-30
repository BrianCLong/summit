import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('AuthMiddleware');

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'intelgraph-api';
const JWT_ISSUER = process.env.JWT_ISSUER || 'https://auth.intelgraph.ai';

// Validate JWT configuration at startup
if (!JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is required for authentication');
}

if (JWT_SECRET.length < 32) {
  throw new Error('FATAL: JWT_SECRET must be at least 32 characters');
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  tenantId: string;
  role: string;
  permissions: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      requestId?: string;
    }
  }
}

/**
 * Extract and validate JWT token from request
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  // Generate request ID
  req.requestId = req.headers['x-request-id'] as string ||
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15);

  // SECURITY: No development bypasses allowed
  // All requests must provide valid JWT tokens
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn('Missing authorization header', { requestId: req.requestId });
    res.status(401).json({ error: 'Missing or invalid authorization header' });
    return;
  }

  const token = authHeader.substring(7);

  try {
    // SECURITY: Verify JWT signature and claims
    const decoded = jwt.verify(token, JWT_SECRET!, {
      audience: JWT_AUDIENCE,
      issuer: JWT_ISSUER,
      algorithms: ['HS256', 'RS256'],
      clockTolerance: 30, // 30 seconds clock skew tolerance
    }) as any;

    // Extract user information from verified token
    req.user = {
      id: decoded.sub || decoded.user_id || decoded.id,
      email: decoded.email,
      tenantId: decoded.tenant_id || decoded.tenantId,
      role: decoded.role || 'viewer',
      permissions: Array.isArray(decoded.permissions) ? decoded.permissions : [],
    };

    // SECURITY: Validate required claims
    if (!req.user.id || !req.user.tenantId) {
      logger.error('JWT missing required claims', {
        hasSub: !!decoded.sub,
        hasTenantId: !!decoded.tenant_id,
        requestId: req.requestId,
      });
      res.status(401).json({ error: 'Invalid token: missing required claims' });
      return;
    }

    logger.debug('User authenticated', {
      userId: req.user.id,
      tenantId: req.user.tenantId,
      requestId: req.requestId,
    });

    next();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.warn('JWT verification failed', {
      error: errorMessage,
      requestId: req.requestId,
    });

    // Return specific error for debugging in development only
    const errorResponse = process.env.NODE_ENV === 'development'
      ? { error: 'Invalid token', details: errorMessage }
      : { error: 'Invalid token' };

    res.status(401).json(errorResponse);
  }
}

/**
 * Require specific permission
 */
export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    if (
      req.user.permissions.includes('*') ||
      req.user.permissions.includes(permission)
    ) {
      return next();
    }

    logger.warn('Permission denied', {
      userId: req.user.id,
      requiredPermission: permission,
      userPermissions: req.user.permissions,
      requestId: req.requestId,
    });

    res.status(403).json({ error: 'Insufficient permissions' });
  };
}

/**
 * Require specific role
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    if (roles.includes(req.user.role)) {
      return next();
    }

    logger.warn('Role check failed', {
      userId: req.user.id,
      requiredRoles: roles,
      userRole: req.user.role,
      requestId: req.requestId,
    });

    res.status(403).json({ error: 'Insufficient role' });
  };
}

/**
 * Rate limiting middleware
 */
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(options: { windowMs: number; max: number }) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.user?.id || req.ip || 'anonymous';
    const now = Date.now();

    let entry = rateLimitStore.get(key);

    if (!entry || entry.resetAt < now) {
      entry = { count: 0, resetAt: now + options.windowMs };
      rateLimitStore.set(key, entry);
    }

    entry.count++;

    res.setHeader('X-RateLimit-Limit', options.max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, options.max - entry.count));
    res.setHeader('X-RateLimit-Reset', entry.resetAt);

    if (entry.count > options.max) {
      logger.warn('Rate limit exceeded', {
        key,
        count: entry.count,
        limit: options.max,
        requestId: req.requestId,
      });
      res.status(429).json({ error: 'Rate limit exceeded' });
      return;
    }

    next();
  };
}
