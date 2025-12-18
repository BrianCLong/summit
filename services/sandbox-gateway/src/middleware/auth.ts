import { Request, Response, NextFunction } from 'express';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('AuthMiddleware');

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

  // For development, use a default user if no auth header
  if (!authHeader && process.env.NODE_ENV !== 'production') {
    req.user = {
      id: 'dev-user-001',
      email: 'dev@example.com',
      tenantId: 'dev-tenant-001',
      role: 'admin',
      permissions: ['*'],
    };
    return next();
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' });
    return;
  }

  const token = authHeader.substring(7);

  try {
    // In production, this would validate the JWT and extract user info
    // For now, decode a mock token format: base64(JSON)
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));

    req.user = {
      id: decoded.sub || decoded.id,
      email: decoded.email,
      tenantId: decoded.tenant_id || decoded.tenantId,
      role: decoded.role || 'viewer',
      permissions: decoded.permissions || [],
    };

    logger.debug('User authenticated', {
      userId: req.user.id,
      tenantId: req.user.tenantId,
      requestId: req.requestId,
    });

    next();
  } catch (error) {
    logger.warn('Authentication failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      requestId: req.requestId,
    });
    res.status(401).json({ error: 'Invalid token' });
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
