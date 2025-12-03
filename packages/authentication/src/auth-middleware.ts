/**
 * Authentication Middleware
 *
 * Express middleware for authentication and authorization
 */

import type { Request, Response, NextFunction } from 'express';
import { JWTManager, TokenPayload } from './jwt/jwt-manager.js';
import { TokenValidator } from './jwt/token-validator.js';
import { APIKeyManager } from './apikeys/apikey-manager.js';
import { RBACManager } from './rbac/rbac-manager.js';
import { createLogger } from './utils/logger.js';

const logger = createLogger('auth-middleware');

export interface AuthRequest extends Request {
  user?: TokenPayload;
  apiKey?: any;
}

export interface AuthMiddlewareConfig {
  jwtManager?: JWTManager;
  apiKeyManager?: APIKeyManager;
  rbacManager?: RBACManager;
  tokenValidator?: TokenValidator;
}

export class AuthMiddleware {
  private jwtManager?: JWTManager;
  private apiKeyManager?: APIKeyManager;
  private rbacManager?: RBACManager;
  private tokenValidator?: TokenValidator;

  constructor(config: AuthMiddlewareConfig) {
    this.jwtManager = config.jwtManager;
    this.apiKeyManager = config.apiKeyManager;
    this.rbacManager = config.rbacManager;
    this.tokenValidator = config.tokenValidator;
  }

  authenticate() {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
      try {
        // Try JWT authentication
        const token = this.extractBearerToken(req);

        if (token && this.jwtManager && this.tokenValidator) {
          const payload = await this.tokenValidator.validate(token);
          req.user = payload;
          return next();
        }

        // Try API key authentication
        const apiKey = this.extractAPIKey(req);

        if (apiKey && this.apiKeyManager) {
          const validatedKey = this.apiKeyManager.validateAPIKey(apiKey);

          if (validatedKey) {
            req.apiKey = validatedKey;
            return next();
          }
        }

        // No valid authentication found
        res.status(401).json({ error: 'Unauthorized' });
      } catch (error) {
        logger.error('Authentication failed', {
          error: error instanceof Error ? error.message : String(error),
        });
        res.status(401).json({ error: 'Unauthorized' });
      }
    };
  }

  requireScopes(scopes: string[]) {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const hasScopes = scopes.every(scope => req.user!.scopes?.includes(scope));

      if (!hasScopes) {
        logger.warn('Insufficient scopes', {
          required: scopes,
          provided: req.user.scopes,
        });
        return res.status(403).json({ error: 'Forbidden: Insufficient scopes' });
      }

      next();
    };
  }

  requireRoles(roles: string[]) {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const hasRoles = roles.every(role => req.user!.roles?.includes(role));

      if (!hasRoles) {
        logger.warn('Insufficient roles', {
          required: roles,
          provided: req.user.roles,
        });
        return res.status(403).json({ error: 'Forbidden: Insufficient roles' });
      }

      next();
    };
  }

  requirePermission(resource: string, action: string) {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
      if (!req.user || !this.rbacManager) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const hasPermission = this.rbacManager.hasPermission(req.user.sub, resource, action);

      if (!hasPermission) {
        logger.warn('Insufficient permissions', {
          userId: req.user.sub,
          resource,
          action,
        });
        return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
      }

      next();
    };
  }

  private extractBearerToken(req: Request): string | null {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    return authHeader.substring(7);
  }

  private extractAPIKey(req: Request): string | null {
    // Check X-API-Key header
    const headerKey = req.headers['x-api-key'] as string;

    if (headerKey) {
      return headerKey;
    }

    // Check query parameter
    const queryKey = req.query.api_key as string;

    if (queryKey) {
      return queryKey;
    }

    return null;
  }
}
