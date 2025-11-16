import { Request, Response, NextFunction } from 'express';
import AuthService from '../services/AuthService.js';

interface AuthenticatedRequest extends Request {
  user?: any;
}

const authService = new AuthService();

/**
 * Middleware to require specific permission(s)
 */
export function requirePermission(permission: string) {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Response | void => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!authService.hasPermission(user, permission)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required: permission,
        userRole: user.role,
      });
    }

    next();
  };
}

/**
 * Middleware to require any of the specified permissions
 */
export function requireAnyPermission(permissions: string[]) {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Response | void => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const hasAny = permissions.some(perm =>
      user.permissions?.includes(perm) || (user as any).role === 'admin'
    );
    if (!hasAny) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required: `Any of: ${permissions.join(', ')}`,
        userRole: user.role,
      });
    }

    next();
  };
}

/**
 * Middleware to require all of the specified permissions
 */
export function requireAllPermissions(permissions: string[]) {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Response | void => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const hasAll = permissions.every(perm =>
      user.permissions?.includes(perm) || (user as any).role === 'admin'
    );
    if (!hasAll) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required: `All of: ${permissions.join(', ')}`,
        userRole: user.role,
      });
    }

    next();
  };
}

/**
 * Middleware for role-based access (convenience wrapper)
 */
export function requireRole(role: string) {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Response | void => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (
      user.role?.toUpperCase() !== role.toUpperCase() &&
      user.role?.toUpperCase() !== 'ADMIN'
    ) {
      return res.status(403).json({
        error: 'Insufficient role',
        required: role,
        userRole: user.role,
      });
    }

    next();
  };
}
