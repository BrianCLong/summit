import { GraphQLError } from 'graphql';
import jwt from 'jsonwebtoken';
import { getPostgresPool } from '../db/postgres.js';
import pino from 'pino';
import { randomUUID } from 'node:crypto';

const logger = pino();
const JWT_SECRET =
  process.env.JWT_SECRET ||
  'dev_jwt_secret_12345_very_long_secret_for_development';

interface User {
  id: string;
  email: string;
  username?: string;
  role?: string;
}

interface AuthContext {
  user?: User;
  isAuthenticated: boolean;
  requestId: string;
}

/**
 * Extracts authentication context from the request headers.
 * Handles JWT token extraction and verification.
 *
 * @param param0 - The request object wrapper.
 * @param param0.req - The incoming HTTP request.
 * @returns A promise resolving to the AuthContext.
 */
export const getContext = async ({
  req,
}: {
  req: any;
}): Promise<AuthContext> => {
  const requestId = randomUUID();
  try {
    const token = extractToken(req);
    if (!token) {
      logger.info({ requestId }, 'Unauthenticated request');
      return { isAuthenticated: false, requestId };
    }

    const user = await verifyToken(token);
    logger.info({ requestId, userId: user.id }, 'Authenticated request');
    return { user, isAuthenticated: true, requestId };
  } catch (error) {
    logger.warn(
      { requestId, error: (error as Error).message },
      'Authentication failed',
    );
    return { isAuthenticated: false, requestId };
  }
};

/**
 * Verifies a JWT token and retrieves the associated user.
 * Supports a dev bypass token in development environments.
 *
 * @param token - The JWT string to verify.
 * @returns A promise resolving to the User object.
 * @throws GraphQLError if the token is invalid or expired.
 */
export const verifyToken = async (token: string): Promise<User> => {
  try {
    // For development, accept a simple test token
    if (process.env.NODE_ENV === 'development' && token === 'dev-token') {
      return {
        id: 'dev-user-1',
        email: 'developer@intelgraph.com',
        username: 'developer',
        role: 'ADMIN',
      };
    }

    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    // Get user from database
    const pool = getPostgresPool();
    const result = await pool.query(
      'SELECT id, email, username, role FROM users WHERE id = $1',
      [decoded.userId],
    );

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    return result.rows[0];
  } catch (error) {
    throw new GraphQLError('Invalid or expired token', {
      extensions: {
        code: 'UNAUTHENTICATED',
        http: { status: 401 },
      },
    });
  }
};

/**
 * Generates a JWT for a user.
 *
 * @param user - The user object to generate a token for.
 * @returns A signed JWT string.
 */
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

/**
 * Enforces authentication requirements for a context.
 * Throws an error if the user is not authenticated.
 *
 * @param context - The authentication context.
 * @returns The authenticated User object.
 * @throws GraphQLError if not authenticated.
 */
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

/**
 * Enforces role-based access control.
 * Throws an error if the user lacks the required role (or isn't ADMIN).
 *
 * @param context - The authentication context.
 * @param requiredRole - The role required to access the resource.
 * @returns The authenticated User object.
 * @throws GraphQLError if permissions are insufficient.
 */
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

function extractToken(req: any): string | null {
  const authHeader = req.headers?.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}
