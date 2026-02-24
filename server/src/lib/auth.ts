// @ts-nocheck
import { GraphQLError } from 'graphql';
import jwt from 'jsonwebtoken';
import { getPostgresPool } from '../db/postgres.js';
import pino from 'pino';
import { randomUUID } from 'node:crypto';
import { createLoaders, Loaders } from '../graphql/loaders.js';
import { extractTenantContext } from '../security/tenantContext.js';
import { cfg } from '../config.js';

const logger = (pino as any)();
export const JWT_SECRET = cfg.JWT_SECRET;

export interface User {
  id: string;
  email: string;
  username?: string;
  role?: string;
  token_version?: number;
  tenantId?: string;
}

export interface AuthContext {
  user?: User;
  isAuthenticated: boolean;
  requestId: string;
  loaders: Loaders;
  tenantContext?: unknown;
}

interface RequestWithUser {
  user?: User;
  tenantContext?: unknown;
  headers?: {
    authorization?: string;
  };
}

interface JWTPayload {
  userId: string;
  email: string;
  role?: string;
  token_version?: number;
}

export const getContext = async ({
  req,
}: {
  req: RequestWithUser;
}): Promise<AuthContext> => {
  const requestId = randomUUID();
  const loaders = createLoaders();

  try {
    // If user is already attached by middleware (e.g. for GraphQL route)
    if (req.user) {
         logger.info({ requestId, userId: req.user.id }, 'Authenticated request (middleware)');
         return {
           user: req.user,
           isAuthenticated: true,
           requestId,
           loaders,
           tenantContext:
             req.tenantContext ||
             extractTenantContext(req, { strict: false }),
         };
    }

    const token = extractToken(req);
    if (!token) {
      if (process.env.ENABLE_INSECURE_DEV_AUTH === 'true' && process.env.NODE_ENV === 'development') {
        logger.info({ requestId }, 'Allowing unauthenticated request (ENABLE_INSECURE_DEV_AUTH)');
        return {
          user: {
            id: 'dev-user-1',
            email: 'developer@intelgraph.com',
            username: 'developer',
            role: 'ADMIN',
            token_version: 0,
            tenantId: 'tenant_1',
          },
          isAuthenticated: true,
          requestId,
          loaders,
          tenantContext:
            req.tenantContext ||
            extractTenantContext(req, { strict: false }),
        };
      }
      logger.info({ requestId }, 'Unauthenticated request');
      return { isAuthenticated: false, requestId, loaders };
    }

    const user = await verifyToken(token);
    logger.info({ requestId, userId: user.id }, 'Authenticated request');
    return {
      user,
      isAuthenticated: true,
      requestId,
      loaders,
      tenantContext:
        req.tenantContext ||
        extractTenantContext(req, { strict: false }),
    };
  } catch (error: any) {
    logger.warn(
      { requestId, error: (error as Error).message },
      'Authentication failed',
    );
    return { isAuthenticated: false, requestId, loaders };
  }
};

export const verifyToken = async (token: string): Promise<User> => {
  try {
    logger.info({ token: token === 'dev-token' ? 'dev-token' : '[REDACTED]' }, 'Verifying token');
    // For development, accept a simple test token
    if (process.env.NODE_ENV === 'development' && token === 'dev-token') {
      logger.info('Accepted dev-token');
      return {
        id: 'dev-user-1',
        email: 'developer@intelgraph.com',
        username: 'developer',
        role: 'ADMIN',
        token_version: 0,
        tenantId: 'tenant_1',
      };
    }

    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;

    // Get user from database
    const pool = getPostgresPool();
    const result = await pool.query(
      'SELECT id, email, username, role, token_version FROM users WHERE id = $1',
      [decoded.userId],
    );

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    const user = result.rows[0] as User;

    if (user.token_version !== decoded.token_version) {
      throw new Error('Token is revoked');
    }

    return user;
  } catch (error: any) {
    throw new GraphQLError('Invalid or expired token', {
      extensions: {
        code: 'UNAUTHENTICATED',
        http: { status: 401 },
      },
    });
  }
};

export const generateTokens = (user: User) => {
  const accessToken = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      token_version: user.token_version,
    },
    JWT_SECRET,
    { expiresIn: '15m' },
  );

  const refreshToken = jwt.sign(
    {
      userId: user.id,
      token_version: user.token_version,
    },
    JWT_SECRET,
    { expiresIn: '7d' },
  );

  return { accessToken, refreshToken };
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

export const requireRole = (
  context: AuthContext,
  requiredRole: string,
): User => {
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

function extractToken(req: RequestWithUser): string | null {
  const authHeader = req.headers?.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}
