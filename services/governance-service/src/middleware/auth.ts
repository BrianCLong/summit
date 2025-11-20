/**
 * Authentication Middleware (Stub)
 * Placeholder for authentication logic - integrate with your auth provider
 */

import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from './error-handler.js';

/**
 * Extended Request interface with user information
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    roles: string[];
    permissions: string[];
  };
}

/**
 * Authentication middleware stub
 * TODO: Integrate with actual authentication provider (JWT, OAuth, SAML, etc.)
 */
export function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedError('No authorization header provided');
    }

    const token = authHeader.replace('Bearer ', '');

    if (!token) {
      throw new UnauthorizedError('Invalid authorization header format');
    }

    // TODO: Validate token with your auth provider
    // Example: JWT verification, OAuth token validation, etc.
    // const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // For now, create a stub user object
    // In production, this should come from token validation
    req.user = {
      id: 'stub-user-id',
      email: 'user@example.com',
      roles: ['user'],
      permissions: ['read', 'write'],
    };

    next();
  } catch (error) {
    next(new UnauthorizedError('Invalid or expired token'));
  }
}

/**
 * Optional authentication middleware
 * Attaches user if token is present, but doesn't fail if missing
 */
export function optionalAuthenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');

      // TODO: Validate token
      req.user = {
        id: 'stub-user-id',
        email: 'user@example.com',
        roles: ['user'],
        permissions: ['read', 'write'],
      };
    }
  } catch (error) {
    // Silently fail for optional auth
  }

  next();
}

/**
 * Authorization middleware - check if user has required role
 */
export function authorize(...allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    const hasRole = allowedRoles.some(role => req.user!.roles.includes(role));

    if (!hasRole) {
      return next(
        new UnauthorizedError(
          `Access denied. Required roles: ${allowedRoles.join(', ')}`
        )
      );
    }

    next();
  };
}

/**
 * Permission-based authorization
 */
export function requirePermission(...requiredPermissions: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    const hasPermission = requiredPermissions.every(permission =>
      req.user!.permissions.includes(permission)
    );

    if (!hasPermission) {
      return next(
        new UnauthorizedError(
          `Access denied. Required permissions: ${requiredPermissions.join(', ')}`
        )
      );
    }

    next();
  };
}

export default {
  authenticate,
  optionalAuthenticate,
  authorize,
  requirePermission,
};
