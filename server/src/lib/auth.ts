import { GraphQLError } from 'graphql';
import jwt from 'jsonwebtoken';
import { getPostgresPool } from '../db/postgres.js';
import baseLogger from '../config/logger';
import { randomUUID as uuidv4 } from 'crypto';
import { federatedUserFromSaml, type FederatedIdentityUser } from '../security/federated-identity.js';

const logger = baseLogger.child({ name: 'auth' });
const JWT_SECRET =
  process.env.JWT_SECRET || 'dev_jwt_secret_12345_very_long_secret_for_development';

export interface User {
  id: string;
  email: string;
  username?: string;
  role?: string;
  roles: string[];
  tenantId?: string;
  orgId?: string;
  teamId?: string;
  identityProvider?: string;
  federated?: boolean;
}

interface AuthContext {
  user?: User;
  isAuthenticated: boolean;
  requestId: string;
}

export const getContext = async ({ req }: { req: any }): Promise<AuthContext> => {
  const requestId = uuidv4();
  try {
    const samlAssertion = extractSamlAssertion(req);
    if (samlAssertion && isSamlEnabled()) {
      const federatedUser = mapFederatedUser(federatedUserFromSaml(samlAssertion));
      logger.info(
        { requestId, userId: federatedUser.id, identityProvider: federatedUser.identityProvider },
        'Authenticated federated request',
      );
      return { user: federatedUser, isAuthenticated: true, requestId };
    } else if (samlAssertion && !isSamlEnabled()) {
      logger.warn({ requestId }, 'Received SAML assertion while federation disabled');
    }

    const token = extractBearerToken(req);
    if (!token) {
      logger.info({ requestId }, 'Unauthenticated request');
      return { isAuthenticated: false, requestId };
    }

    const user = await verifyToken(token);
    logger.info({ requestId, userId: user.id }, 'Authenticated request');
    return { user, isAuthenticated: true, requestId };
  } catch (error) {
    logger.warn({ requestId, error: (error as Error).message }, 'Authentication failed');
    return { isAuthenticated: false, requestId };
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
      };
    }

    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    // Get user from database
    const pool = getPostgresPool();
    const result = await pool.query('SELECT id, email, username, role FROM users WHERE id = $1', [
      decoded.userId,
    ]);

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    const dbUser = result.rows[0];
    const role = (dbUser.role || 'viewer').toUpperCase();

    return {
      ...dbUser,
      role,
      roles: [role],
      identityProvider: 'oidc',
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
      roles: user.roles || (user.role ? [user.role] : []),
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
  const normalizedRequired = requiredRole.toUpperCase();
  const userRoles = new Set<string>();
  if (user.role) {
    userRoles.add(user.role.toUpperCase());
  }
  for (const role of user.roles || []) {
    userRoles.add(role.toUpperCase());
  }

  if (!userRoles.has(normalizedRequired) && !userRoles.has('ADMIN')) {
    throw new GraphQLError('Insufficient permissions', {
      extensions: {
        code: 'FORBIDDEN',
        http: { status: 403 },
      },
    });
  }
  return user;
};

function extractBearerToken(req: any): string | null {
  const authHeader = req.headers?.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

function extractSamlAssertion(req: any): string | null {
  const authHeader = req.headers?.authorization;
  if (authHeader?.startsWith('SAML ')) {
    return authHeader.substring(5);
  }

  const headerAssertion = req.headers?.['x-saml-assertion'];
  if (typeof headerAssertion === 'string' && headerAssertion.trim().length > 0) {
    return headerAssertion;
  }

  return null;
}

function mapFederatedUser(user: FederatedIdentityUser): User {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    roles: user.roles,
    tenantId: user.tenantId,
    orgId: user.orgId,
    teamId: user.teamId,
    identityProvider: user.identityProvider,
    federated: user.federated,
  };
}

function isSamlEnabled(): boolean {
  return (process.env.SAML_ENABLED || '').toLowerCase() === 'true';
}
