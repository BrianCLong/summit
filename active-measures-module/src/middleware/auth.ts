import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import logger from '../utils/logger';
import { metricsCollector } from '../utils/metrics';

interface User {
  id: string;
  username: string;
  role: string;
  clearanceLevel: string;
  permissions: string[];
  activeOperations: string[];
}

interface AuthContext {
  user: User | null;
  isAuthenticated: boolean;
  hasPermission: (permission: string) => boolean;
  hasClearance: (level: string) => boolean;
}

const JWT_SECRET = process.env.JWT_SECRET || 'active-measures-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Classification levels hierarchy (higher number = higher clearance)
const CLEARANCE_LEVELS = {
  UNCLASSIFIED: 0,
  CONFIDENTIAL: 1,
  SECRET: 2,
  TOP_SECRET: 3,
  SCI: 4,
};

// Mock user database - in production, this would be a proper database
const MOCK_USERS: Record<string, any> = {
  'analyst1': {
    id: 'user_001',
    username: 'analyst1',
    passwordHash: '$2b$10$example.hash.here',
    role: 'ANALYST',
    clearanceLevel: 'SECRET',
    permissions: ['READ_operations', 'create_simulations', 'view_audit_trail'],
    activeOperations: [],
  },
  'operator1': {
    id: 'user_002',
    username: 'operator1',
    passwordHash: '$2b$10$example.hash.here',
    role: 'OPERATOR',
    clearanceLevel: 'TOP_SECRET',
    permissions: ['read_operations', 'create_operations', 'execute_operations', 'create_simulations'],
    activeOperations: [],
  },
  'supervisor1': {
    id: 'user_003',
    username: 'supervisor1',
    passwordHash: '$2b$10$example.hash.here',
    role: 'SUPERVISOR',
    clearanceLevel: 'TOP_SECRET',
    permissions: ['all_permissions'],
    activeOperations: [],
  },
};

export async function authenticateUser(req: any): Promise<User | null> {
  try {
    const authHeader = req.headers?.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('Missing or invalid authorization header', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });
      metricsCollector.incrementCounter('auth_failures_missing_token');
      return null;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // In production, fetch user from database
    const userRecord = MOCK_USERS[decoded.username];
    if (!userRecord) {
      logger.warn('User not found', { username: decoded.username });
      metricsCollector.incrementCounter('auth_failures_user_not_found');
      return null;
    }

    const user: User = {
      id: userRecord.id,
      username: userRecord.username,
      role: userRecord.role,
      clearanceLevel: userRecord.clearanceLevel,
      permissions: userRecord.permissions,
      activeOperations: userRecord.activeOperations,
    };

    logger.info('User authenticated successfully', {
      userId: user.id,
      username: user.username,
      role: user.role,
      clearanceLevel: user.clearanceLevel,
    });

    metricsCollector.incrementCounter('auth_successes');
    return user;
  } catch (error) {
    logger.error('Authentication failed', {
      error: error.message,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });
    metricsCollector.incrementCounter('auth_failures_invalid_token');
    return null;
  }
}

export function authorizeOperation(user: User, operation: string, resourceClassification?: string): boolean {
  try {
    // Check if user has required permission
    if (!user.permissions.includes('all_permissions') && !user.permissions.includes(operation)) {
      logger.warn('Operation not permitted', {
        userId: user.id,
        operation,
        userPermissions: user.permissions,
      });
      metricsCollector.incrementCounter('authorization_failures_permission');
      return false;
    }

    // Check clearance level if resource has classification
    if (resourceClassification) {
      const userClearance = CLEARANCE_LEVELS[user.clearanceLevel as keyof typeof CLEARANCE_LEVELS] || 0;
      const requiredClearance = CLEARANCE_LEVELS[resourceClassification as keyof typeof CLEARANCE_LEVELS] || 0;
      
      if (userClearance < requiredClearance) {
        logger.warn('Insufficient clearance level', {
          userId: user.id,
          operation,
          userClearance: user.clearanceLevel,
          requiredClearance: resourceClassification,
        });
        metricsCollector.incrementCounter('authorization_failures_clearance');
        return false;
      }
    }

    logger.debug('Operation authorized', {
      userId: user.id,
      operation,
      resourceClassification,
    });

    metricsCollector.incrementCounter('authorization_successes');
    return true;
  } catch (error) {
    logger.error('Authorization check failed', {
      error: error.message,
      userId: user.id,
      operation,
    });
    metricsCollector.incrementCounter('authorization_failures_error');
    return false;
  }
}

export function createAuthContext(user: User | null): AuthContext {
  return {
    user,
    isAuthenticated: user !== null,
    hasPermission: (permission: string) => {
      if (!user) return false;
      return user.permissions.includes('all_permissions') || user.permissions.includes(permission);
    },
    hasClearance: (level: string) => {
      if (!user) return false;
      const userClearance = CLEARANCE_LEVELS[user.clearanceLevel as keyof typeof CLEARANCE_LEVELS] || 0;
      const requiredClearance = CLEARANCE_LEVELS[level as keyof typeof CLEARANCE_LEVELS] || 0;
      return userClearance >= requiredClearance;
    },
  };
}

// Generate JWT token for user (used in login)
export function generateToken(user: User): string {
  const payload = {
    id: user.id,
    username: user.username,
    role: user.role,
    clearanceLevel: user.clearanceLevel,
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Validate password (mock implementation)
export async function validatePassword(username: string, password: string): Promise<User | null> {
  const userRecord = MOCK_USERS[username];
  if (!userRecord) {
    logger.warn('Login attempt for non-existent user', { username });
    metricsCollector.incrementCounter('login_failures_user_not_found');
    return null;
  }

  // In production, use proper bcrypt comparison
  // const isValid = await bcrypt.compare(password, userRecord.passwordHash);
  const isValid = password === 'demo-password'; // Mock validation
  
  if (!isValid) {
    logger.warn('Invalid password', { username });
    metricsCollector.incrementCounter('login_failures_invalid_password');
    return null;
  }

  const user: User = {
    id: userRecord.id,
    username: userRecord.username,
    role: userRecord.role,
    clearanceLevel: userRecord.clearanceLevel,
    permissions: userRecord.permissions,
    activeOperations: userRecord.activeOperations,
  };

  logger.info('User login successful', {
    userId: user.id,
    username: user.username,
    role: user.role,
  });

  metricsCollector.incrementCounter('login_successes');
  return user;
}

// Express middleware for authentication
export function requireAuth(req: any, res: any, next: any): void {
  authenticateUser(req)
    .then((user) => {
      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      req.user = user;
      req.authContext = createAuthContext(user);
      next();
    })
    .catch((error) => {
      logger.error('Authentication middleware error', { error: error.message });
      res.status(500).json({ error: 'Authentication error' });
    });
}

// Express middleware for authorization
export function requirePermission(operation: string, classification?: string) {
  return (req: any, res: any, next: any): void => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!authorizeOperation(user, operation, classification)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}

export default {
  authenticateUser,
  authorizeOperation,
  createAuthContext,
  generateToken,
  validatePassword,
  requireAuth,
  requirePermission,
};