import { GraphQLError } from 'graphql';
import jwt from 'jsonwebtoken';
import { getPostgresPool } from '../db/postgres.js';
import baseLogger from '../config/logger';
import { randomUUID as uuidv4 } from 'crypto';

const logger = baseLogger.child({ name: 'auth' });
const JWT_SECRET =
  process.env.JWT_SECRET || 'dev_jwt_secret_12345_very_long_secret_for_development';

interface User {
  id: string;
  email: string;
  username?: string;
  role?: string;
  roles: string[];
  tenantId: string;
  permissions: string[];
}

interface AuthContext {
  user?: User;
  isAuthenticated: boolean;
  requestId: string;
  tenantId?: string;
  roles: string[];
  permissions: string[];
}

export const getContext = async ({ req }: { req: any }): Promise<AuthContext> => {
  const requestId = uuidv4();
  try {
    const token = extractToken(req);
    if (!token) {
      logger.info({ requestId }, 'Unauthenticated request');
      return { isAuthenticated: false, requestId, roles: [], permissions: [] };
    }

    const user = await verifyToken(token);
    logger.info({ requestId, userId: user.id, tenantId: user.tenantId }, 'Authenticated request');
    return {
      user,
      isAuthenticated: true,
      requestId,
      tenantId: user.tenantId,
      roles: user.roles,
      permissions: user.permissions,
    };
  } catch (error) {
    logger.warn({ requestId, error: (error as Error).message }, 'Authentication failed');
    return { isAuthenticated: false, requestId, roles: [], permissions: [] };
  }
};

export const verifyToken = async (token: string): Promise<User> => {
  try {
    // For development, accept a simple test token
    if (process.env.NODE_ENV === 'development' && token === 'dev-token') {
      return {
        id: 'dev-user-1',
        email: 'developer@intelgraph.com',
        username: 'developer',
        role: 'ADMIN',
        roles: ['ADMIN'],
        tenantId: 'dev-tenant',
        permissions: ['*'],
      };
    }

    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    const tenantClaim =
      decoded.tenantId ||
      decoded.tenant_id ||
      decoded['https://summit.ai/tenant'] ||
      decoded['https://summit.ai/tenant_id'] ||
      decoded['https://intelgraph.com/tenant'] ||
      decoded['https://intelgraph.com/tenant_id'];

    if (!tenantClaim) {
      throw new GraphQLError('Tenant claim missing', {
        extensions: {
          code: 'TENANT_REQUIRED',
          http: { status: 403 },
        },
      });
    }

    const roleClaims: string[] = [];
    if (Array.isArray(decoded.roles)) {
      roleClaims.push(...decoded.roles);
    }
    if (decoded.role) {
      roleClaims.push(decoded.role);
    }
    if (decoded.realm_access?.roles) {
      roleClaims.push(...decoded.realm_access.roles);
    }

    const roles = Array.from(new Set(roleClaims.map((role) => role?.toString())));
    const primaryRole = decoded.role || roles[0] || 'USER';

    const permissionClaims: string[] = [];
    if (Array.isArray(decoded.permissions)) {
      permissionClaims.push(...decoded.permissions);
    }
    if (typeof decoded.scope === 'string') {
      permissionClaims.push(...decoded.scope.split(' '));
    }

    // Get user from database
    const userId = decoded.userId || decoded.sub;
    if (!userId) {
      throw new GraphQLError('Token missing subject identifier', {
        extensions: {
          code: 'UNAUTHENTICATED',
          http: { status: 401 },
        },
      });
    }

    const pool = getPostgresPool();
    const result = await pool.query('SELECT id, email, username, role FROM users WHERE id = $1', [
      userId,
    ]);

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    const dbUser = result.rows[0];

    const userRoles = Array.from(new Set([dbUser.role, primaryRole, ...roles].filter(Boolean)));

    return {
      id: dbUser.id,
      email: dbUser.email,
      username: dbUser.username,
      role: userRoles[0],
      roles: userRoles,
      tenantId: tenantClaim,
      permissions: Array.from(new Set(permissionClaims)),
    };
  } catch (error) {
    throw new GraphQLError('Invalid or expired token', {
      extensions: {
        code: 'UNAUTHENTICATED',
        http: { status: 401 },
      },
    });
  }
};

export const generateToken = (user: User): string => {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      roles: user.roles,
      tenantId: user.tenantId,
      permissions: user.permissions,
    },
    JWT_SECRET,
    { expiresIn: '1h' },
  );
};

export const requireAuth = (context: AuthContext): User => {
  if (!context.isAuthenticated || !context.user) {
    throw new GraphQLError('Authentication required', {
      extensions: {
        code: 'UNAUTHENTICATED',
        http: { status: 401 },
      },
    });
  }
  return context.user;
};

export const requireRole = (context: AuthContext, requiredRole: string): User => {
  const user = requireAuth(context);
  const normalizedRoles = new Set(user.roles.map((role) => role.toUpperCase()));
  normalizedRoles.add((user.role || '').toUpperCase());
  if (!normalizedRoles.has(requiredRole.toUpperCase()) && !normalizedRoles.has('ADMIN')) {
    throw new GraphQLError('Insufficient permissions', {
      extensions: {
        code: 'FORBIDDEN',
        http: { status: 403 },
      },
    });
  }
  return user;
};

function extractToken(req: any): string | null {
  const authHeader = req.headers?.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}
