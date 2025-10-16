// server/src/conductor/auth/rbac-middleware.ts

import { Request, Response, NextFunction } from 'express';
import { jwtRotationManager } from './jwt-rotation.js';
import logger from '../../config/logger.js';

export interface AuthenticatedUser {
  sub: string;
  email: string;
  name?: string;
  groups?: string[];
  roles?: string[];
  tenantId?: string;
  userId: string;
  permissions?: string[];
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
  headers: Request['headers'] & {
    'x-auth-request-user'?: string;
    'x-auth-request-email'?: string;
    'x-auth-request-groups'?: string;
    'x-auth-request-preferred-username'?: string;
  };
}

interface RoleDefinition {
  name: string;
  description: string;
  permissions: string[];
}

interface RBACConfig {
  enabled: boolean;
  rolesClaim: string;
  roles: Record<string, RoleDefinition>;
  defaultRole: string;
}

class RBACManager {
  private config: RBACConfig;
  private permissionCache: Map<string, Set<string>> = new Map();

  constructor() {
    this.config = {
      enabled: process.env.RBAC_ENABLED === 'true' || true,
      rolesClaim: process.env.RBAC_ROLES_CLAIM || 'groups',
      defaultRole: process.env.RBAC_DEFAULT_ROLE || 'viewer',
      roles: {
        admin: {
          name: 'admin',
          description: 'Full administrative access',
          permissions: ['*'],
        },
        operator: {
          name: 'operator',
          description: 'Workflow and task management',
          permissions: [
            'workflow:read',
            'workflow:execute',
            'workflow:create',
            'workflow:update',
            'workflow:delete',
            'task:read',
            'task:execute',
            'task:create',
            'metrics:read',
            'evidence:read',
            'evidence:create',
            'policies:read',
            'serving:read',
            'serving:execute',
          ],
        },
        analyst: {
          name: 'analyst',
          description: 'Analysis execution and read access',
          permissions: [
            'workflow:read',
            'workflow:execute',
            'task:read',
            'task:execute',
            'metrics:read',
            'evidence:read',
            'evidence:create',
            'policies:read',
            'serving:read',
            'serving:execute',
          ],
        },
        viewer: {
          name: 'viewer',
          description: 'Read-only access',
          permissions: [
            'workflow:read',
            'task:read',
            'metrics:read',
            'evidence:read',
            'policies:read',
            'serving:read',
          ],
        },
      },
    };

    this.loadConfigFromEnvironment();
    this.buildPermissionCache();
  }

  private loadConfigFromEnvironment(): void {
    try {
      if (process.env.RBAC_CONFIG) {
        const envConfig = JSON.parse(process.env.RBAC_CONFIG);
        this.config = { ...this.config, ...envConfig };
      }
    } catch (error) {
      logger.warn(
        '⚠️ Failed to parse RBAC_CONFIG from environment, using defaults',
        { error: error.message },
      );
    }
  }

  private buildPermissionCache(): void {
    for (const [roleName, role] of Object.entries(this.config.roles)) {
      const permissions = new Set<string>();

      for (const permission of role.permissions) {
        if (permission === '*') {
          // Wildcard permission grants all
          permissions.add('*');
        } else {
          permissions.add(permission.toLowerCase());
        }
      }

      this.permissionCache.set(roleName, permissions);
    }

    logger.info('🔐 RBAC permission cache built', {
      roles: Object.keys(this.config.roles),
      enabled: this.config.enabled,
    });
  }

  getUserRoles(user: AuthenticatedUser): string[] {
    if (!this.config.enabled) {
      return ['admin']; // Default to admin when RBAC disabled
    }

    const rolesFromClaim =
      (user[this.config.rolesClaim as keyof AuthenticatedUser] as string[]) ||
      [];
    const rolesFromUser = user.roles || [];

    const allRoles = [...new Set([...rolesFromClaim, ...rolesFromUser])];

    // If no roles found, assign default role
    if (allRoles.length === 0) {
      return [this.config.defaultRole];
    }

    return allRoles.filter((role) => this.config.roles[role]);
  }

  getUserPermissions(user: AuthenticatedUser): Set<string> {
    const roles = this.getUserRoles(user);
    const userPermissions = new Set<string>();

    for (const role of roles) {
      const rolePermissions = this.permissionCache.get(role);
      if (rolePermissions) {
        if (rolePermissions.has('*')) {
          return new Set(['*']); // Wildcard grants all permissions
        }
        rolePermissions.forEach((permission) =>
          userPermissions.add(permission),
        );
      }
    }

    return userPermissions;
  }

  hasPermission(user: AuthenticatedUser, requiredPermission: string): boolean {
    if (!this.config.enabled) {
      return true; // Allow all when RBAC disabled
    }

    const userPermissions = this.getUserPermissions(user);

    if (userPermissions.has('*')) {
      return true; // Wildcard permission
    }

    const normalizedPermission = requiredPermission.toLowerCase();

    // Check exact permission match
    if (userPermissions.has(normalizedPermission)) {
      return true;
    }

    // Check wildcard resource permissions (e.g., workflow:* matches workflow:read)
    const [resource] = normalizedPermission.split(':');
    if (userPermissions.has(`${resource}:*`)) {
      return true;
    }

    return false;
  }

  getConfig(): RBACConfig {
    return { ...this.config };
  }
}

export const rbacManager = new RBACManager();

/**
 * Authentication middleware - extracts user from JWT or OAuth proxy headers
 */
export function authenticateUser(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  try {
    let user: AuthenticatedUser | null = null;

    // Try OAuth2 Proxy headers first (production)
    if (
      req.headers['x-auth-request-user'] &&
      req.headers['x-auth-request-email']
    ) {
      const groups = req.headers['x-auth-request-groups']
        ? (req.headers['x-auth-request-groups'] as string)
            .split(',')
            .map((g) => g.trim())
        : [];

      user = {
        userId: req.headers['x-auth-request-user'] as string,
        sub: req.headers['x-auth-request-user'] as string,
        email: req.headers['x-auth-request-email'] as string,
        name: req.headers['x-auth-request-preferred-username'] as string,
        groups,
        roles: groups,
        tenantId: (req.headers['x-tenant-id'] as string) || 'default',
      };
    }
    // Try Authorization Bearer token (development/API)
    else if (req.headers.authorization) {
      const token = req.headers.authorization.replace('Bearer ', '');

      jwtRotationManager
        .verifyToken(token)
        .then((payload) => {
          if (typeof payload === 'object' && payload.sub) {
            user = {
              userId: payload.sub,
              sub: payload.sub,
              email: payload.email || '',
              name: payload.name,
              groups: payload.groups || [],
              roles: payload.roles || payload.groups || [],
              tenantId: payload.tenantId || 'default',
            };

            (req as AuthenticatedRequest).user = user;
            logger.debug('👤 User authenticated via JWT', {
              userId: user.userId,
              roles: rbacManager.getUserRoles(user),
            });

            next();
          } else {
            res.status(401).json({ error: 'Invalid token payload' });
          }
        })
        .catch((error) => {
          logger.warn('🚫 JWT token verification failed', {
            error: error.message,
          });
          res.status(401).json({ error: 'Invalid token' });
        });
      return;
    }
    // Development bypass
    else if (
      process.env.NODE_ENV === 'development' ||
      process.env.AUTH_BYPASS === 'true'
    ) {
      user = {
        userId: 'dev-user',
        sub: 'dev-user',
        email: 'dev@intelgraph.io',
        name: 'Development User',
        groups: ['admin'],
        roles: ['admin'],
        tenantId: 'development',
      };
    }

    if (!user) {
      logger.warn('🚫 Authentication required but no valid credentials found');
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please provide valid JWT token or OAuth proxy headers',
      });
    }

    (req as AuthenticatedRequest).user = user;

    logger.debug('👤 User authenticated', {
      userId: user.userId,
      email: user.email,
      roles: rbacManager.getUserRoles(user),
      method: req.headers['x-auth-request-user'] ? 'oauth-proxy' : 'jwt',
    });

    next();
  } catch (error) {
    logger.error('❌ Authentication middleware error', {
      error: error.message,
    });
    res.status(500).json({ error: 'Authentication service error' });
  }
}

/**
 * Authorization middleware factory - checks if user has required permission
 */
export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const user = (req as AuthenticatedRequest).user;

      if (!user) {
        logger.warn('🚫 Authorization check failed - no authenticated user');
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (!rbacManager.hasPermission(user, permission)) {
        const userRoles = rbacManager.getUserRoles(user);
        const userPermissions = Array.from(
          rbacManager.getUserPermissions(user),
        );

        logger.warn('🚫 Authorization denied', {
          userId: user.userId,
          requiredPermission: permission,
          userRoles,
          userPermissions,
        });

        return res.status(403).json({
          error: 'Insufficient permissions',
          required: permission,
          userRoles,
          userPermissions: userPermissions.slice(0, 10), // Limit for security
        });
      }

      logger.debug('✅ Authorization granted', {
        userId: user.userId,
        permission,
        roles: rbacManager.getUserRoles(user),
      });

      next();
    } catch (error) {
      logger.error('❌ Authorization middleware error', {
        error: error.message,
        permission,
      });
      res.status(500).json({ error: 'Authorization service error' });
    }
  };
}

/**
 * Multi-permission authorization middleware
 */
export function requireAnyPermission(...permissions: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const user = (req as AuthenticatedRequest).user;

      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const hasAnyPermission = permissions.some((permission) =>
        rbacManager.hasPermission(user, permission),
      );

      if (!hasAnyPermission) {
        logger.warn('🚫 Authorization denied - no matching permissions', {
          userId: user.userId,
          requiredPermissions: permissions,
          userRoles: rbacManager.getUserRoles(user),
        });

        return res.status(403).json({
          error: 'Insufficient permissions',
          required: permissions,
          userRoles: rbacManager.getUserRoles(user),
        });
      }

      next();
    } catch (error) {
      logger.error('❌ Multi-permission authorization error', {
        error: error.message,
      });
      res.status(500).json({ error: 'Authorization service error' });
    }
  };
}

/**
 * Get user information endpoint
 */
export function getUserInfo(req: Request, res: Response): void {
  try {
    const user = (req as AuthenticatedRequest).user;

    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userRoles = rbacManager.getUserRoles(user);
    const userPermissions = Array.from(rbacManager.getUserPermissions(user));

    res.json({
      user: {
        userId: user.userId,
        email: user.email,
        name: user.name,
        tenantId: user.tenantId,
      },
      authorization: {
        roles: userRoles,
        permissions: userPermissions,
        config: {
          rbacEnabled: rbacManager.getConfig().enabled,
          defaultRole: rbacManager.getConfig().defaultRole,
        },
      },
    });
  } catch (error) {
    logger.error('❌ Get user info error', { error: error.message });
    res.status(500).json({ error: 'Failed to get user information' });
  }
}
