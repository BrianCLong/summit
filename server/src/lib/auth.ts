import { GraphQLError } from 'graphql';
import jwt from 'jsonwebtoken';
import { getPostgresPool } from '../db/postgres.js';
import pino from 'pino';
import { randomUUID } from 'node:crypto';

const logger = pino();
const JWT_SECRET =
  process.env.JWT_SECRET ||
  'dev_jwt_secret_12345_very_long_secret_for_development';

/**
 * Represents an authenticated user in the system.
 */
interface User {
  id: string;
  email: string;
  username?: string;
  role?: string;
}

/**
 * Context object for authentication in GraphQL requests.
 */
interface AuthContext {
  user?: User;
  isAuthenticated: boolean;
  requestId: string;
}

/**
 * Retrieves the authentication context for a given request.
 * Extracts the token from the request headers, verifies it, and returns the user information.
 *
 * @param {object} param0 - The object containing the request.
 * @param {any} param0.req - The HTTP request object.
 * @returns {Promise<AuthContext>} The authentication context.
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
 *
 * @param {string} token - The JWT token to verify.
 * @returns {Promise<User>} The user associated with the token.
 * @throws {GraphQLError} If the token is invalid, expired, or the user is not found.
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
 * Generates a JWT token for a given user.
 *
 * @param {User} user - The user for whom to generate the token.
 * @returns {string} The generated JWT token.
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
 * Ensures that the request is authenticated.
 *
 * @param {AuthContext} context - The authentication context.
 * @returns {User} The authenticated user.
 * @throws {GraphQLError} If the user is not authenticated.
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
 * Ensures that the authenticated user has a specific role.
 *
 * @param {AuthContext} context - The authentication context.
 * @param {string} requiredRole - The role required to access the resource.
 * @returns {User} The authenticated user.
 * @throws {GraphQLError} If the user does not have the required role.
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
