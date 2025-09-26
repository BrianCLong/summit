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
  tenantId?: string;
}

interface AuthContext {
  user?: User;
  isAuthenticated: boolean;
  requestId: string;
  tenantId?: string;
}

export const getContext = async ({ req }: { req: any }): Promise<AuthContext> => {
  const requestId = uuidv4();
  try {
    const token = extractToken(req);
    const tenantFromHeader =
      req?.headers?.['x-tenant-id'] || req?.headers?.['X-Tenant-Id'] || req?.headers?.['x-tenant'] || undefined;
    if (!token) {
      logger.info({ requestId }, 'Unauthenticated request');
      return { isAuthenticated: false, requestId, tenantId: tenantFromHeader };
    }

    const user = await verifyToken(token, tenantFromHeader);
    if (!user.tenantId && tenantFromHeader) {
      user.tenantId = tenantFromHeader;
    }
    logger.info({ requestId, userId: user.id }, 'Authenticated request');
    return { user, isAuthenticated: true, requestId, tenantId: user.tenantId || tenantFromHeader };
  } catch (error) {
    logger.warn({ requestId, error: (error as Error).message }, 'Authentication failed');
    return { isAuthenticated: false, requestId };
  }
};

export const verifyToken = async (token: string, fallbackTenantId?: string): Promise<User> => {
  try {
    // For development, accept a simple test token
    if (process.env.NODE_ENV !== 'production' && token === 'dev-token') {
      return {
        id: 'dev-user-1',
        email: 'developer@intelgraph.com',
        username: 'developer',
        role: 'ADMIN',
        tenantId: fallbackTenantId || 'dev-tenant',
      };
    }

    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    // Get user from database
    try {
      const pool = getPostgresPool();
      const result = await pool.query(
        'SELECT id, email, username, role, tenant_id as "tenantId" FROM users WHERE id = $1',
        [decoded.userId],
      );

      if (result.rows.length > 0) {
        const user = result.rows[0];
        if (!user.tenantId) {
          user.tenantId = decoded.tenantId || fallbackTenantId;
        }
        return user;
      }
    } catch (dbError) {
      if (process.env.NODE_ENV === 'production') {
        throw dbError;
      }
      logger.warn(
        {
          err: dbError instanceof Error ? dbError.message : dbError,
        },
        'Falling back to token payload for user verification',
      );
    }

    // Fall back to token payload in non-production environments
    if (process.env.NODE_ENV !== 'production') {
      return {
        id: decoded.userId || decoded.sub || 'token-user',
        email: decoded.email || 'token-user@intelgraph.local',
        username: decoded.username,
        role: decoded.role || 'ANALYST',
        tenantId: decoded.tenantId || fallbackTenantId || 'dev-tenant',
      };
    }

    throw new Error('User not found');
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
  if (user.role !== requiredRole && user.role !== 'ADMIN') {
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
