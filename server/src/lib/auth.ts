import { GraphQLError } from 'graphql';
import jwt from 'jsonwebtoken';
import { randomUUID as uuidv4 } from 'crypto';
import baseLogger from '../config/logger';
import AuthService from '../services/AuthService.js';

const logger = baseLogger.child({ name: 'auth' });
const JWT_SECRET =
  process.env.JWT_SECRET || 'dev_jwt_secret_12345_very_long_secret_for_development';
const authService = new AuthService();

interface User {
  id: string;
  email: string;
  username?: string;
  role?: string;
  roles?: string[];
  permissions?: string[];
}

interface AuthContext {
  user?: User;
  isAuthenticated: boolean;
  requestId: string;
}

export const getContext = async ({ req }: { req: any }): Promise<AuthContext> => {
  const requestId = uuidv4();
  try {
    const token = extractToken(req);
    if (!token) {
      logger.info({ requestId }, 'Unauthenticated request');
      return { isAuthenticated: false, requestId };
    }

    const user = await authService.verifyToken(token);
    if (!user) {
      logger.info({ requestId }, 'Token verification failed');
      return { isAuthenticated: false, requestId };
    }

    logger.info({ requestId, userId: user.id }, 'Authenticated request');
    return { user, isAuthenticated: true, requestId };
  } catch (error) {
    logger.warn({ requestId, error: (error as Error).message }, 'Authentication failed');
    return { isAuthenticated: false, requestId };
  }
};

export const verifyToken = async (token: string): Promise<User> => {
  try {
    if (process.env.NODE_ENV === 'development' && token === 'dev-token') {
      return {
        id: 'dev-user-1',
        email: 'developer@intelgraph.com',
        username: 'developer',
        role: 'ADMIN',
        roles: ['ADMIN'],
        permissions: ['*'],
      };
    }

    const user = await authService.verifyToken(token);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
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
  const normalizedRoles = user.roles?.map((role) => role.toUpperCase()) || (user.role ? [user.role.toUpperCase()] : []);
  const target = requiredRole.toUpperCase();
  if (!normalizedRoles.includes(target) && !normalizedRoles.includes('ADMIN')) {
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
