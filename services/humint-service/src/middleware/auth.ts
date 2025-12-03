/**
 * Authentication Middleware
 *
 * JWT-based authentication with role and clearance level validation.
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ServiceContext } from '../context.js';
import { UnauthorizedError, ForbiddenError } from './error-handler.js';
import type { ClassificationLevel } from '@intelgraph/humint-types';

export interface AuthenticatedUser {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  roles: string[];
  clearanceLevel: ClassificationLevel;
  compartments: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      tenantId?: string;
    }
  }
}

/**
 * Simple JWT decode for development
 * In production, use proper JWT verification with JWKS
 */
function decodeJwt(token: string): AuthenticatedUser | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());

    return {
      id: payload.sub || payload.userId,
      tenantId: payload.tenantId || 'default',
      email: payload.email || '',
      name: payload.name || '',
      roles: payload.roles || [],
      clearanceLevel: payload.clearanceLevel || 'UNCLASSIFIED',
      compartments: payload.compartments || [],
    };
  } catch {
    return null;
  }
}

export function authMiddleware(ctx: ServiceContext): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      // Allow development bypass
      if (process.env.NODE_ENV === 'development' && process.env.AUTH_BYPASS === 'true') {
        req.user = {
          id: 'dev-user',
          tenantId: 'dev-tenant',
          email: 'dev@example.com',
          name: 'Development User',
          roles: ['admin', 'handler', 'analyst'],
          clearanceLevel: 'TOP_SECRET_SCI',
          compartments: ['HUMINT', 'SIGINT', 'COMINT'],
        };
        req.tenantId = req.user.tenantId;
        next();
        return;
      }

      next(new UnauthorizedError('Missing authorization header'));
      return;
    }

    const token = authHeader.slice(7);
    const user = decodeJwt(token);

    if (!user) {
      next(new UnauthorizedError('Invalid token'));
      return;
    }

    req.user = user;
    req.tenantId = user.tenantId;
    next();
  };
}

/**
 * Require specific roles
 */
export function requireRoles(...roles: string[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError());
      return;
    }

    const hasRole = roles.some((role) => req.user!.roles.includes(role));
    if (!hasRole) {
      next(new ForbiddenError(`Required roles: ${roles.join(', ')}`));
      return;
    }

    next();
  };
}

/**
 * Require minimum clearance level
 */
const CLEARANCE_ORDER: ClassificationLevel[] = [
  'UNCLASSIFIED',
  'CONFIDENTIAL',
  'SECRET',
  'TOP_SECRET',
  'TOP_SECRET_SCI',
];

export function requireClearance(minLevel: ClassificationLevel): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError());
      return;
    }

    const userLevel = CLEARANCE_ORDER.indexOf(req.user.clearanceLevel);
    const requiredLevel = CLEARANCE_ORDER.indexOf(minLevel);

    if (userLevel < requiredLevel) {
      next(new ForbiddenError(`Requires ${minLevel} clearance`));
      return;
    }

    next();
  };
}

/**
 * Require specific compartment access
 */
export function requireCompartment(compartment: string): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError());
      return;
    }

    if (!req.user.compartments.includes(compartment)) {
      next(new ForbiddenError(`Requires ${compartment} compartment access`));
      return;
    }

    next();
  };
}
