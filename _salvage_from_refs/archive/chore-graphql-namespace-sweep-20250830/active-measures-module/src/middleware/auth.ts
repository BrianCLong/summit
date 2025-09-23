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
    passwordHash: bcrypt.hashSync('password123', 10),
    role: 'ANALYST',
    clearanceLevel: 'SECRET',
    permissions: ['READ_operations', 'create_simulations', 'view_audit_trail'],
    activeOperations: [],
  },
  'operator1': {
    id: 'user_002',
    username: 'operator1',
    passwordHash: bcrypt.hashSync('securepass', 10),
    role: 'OPERATOR',
    clearanceLevel: 'TOP_SECRET',
    permissions: ['read_operations', 'create_operations', 'execute_operations', 'create_simulations'],
    activeOperations: [],
  },
  'supervisor1': {
    id: 'user_003',
    username: 'supervisor1',
    passwordHash: bcrypt.hashSync('adminpass', 10),
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
      logger.warn('Missing or invalid Authorization header');
      metricsCollector.increment('auth.failed', { reason: 'missing_header' });
      return null;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { username: string };

    const user = MOCK_USERS[decoded.username];
    if (!user) {
      logger.warn(`User not found: ${decoded.username}`);
      metricsCollector.increment('auth.failed', { reason: 'user_not_found' });
      return null;
    }

    // In a real system, you'd fetch the user from a database
    // and verify the password hash if it's a password-based authentication
    // For token-based, you'd validate the token's signature and expiry

    metricsCollector.increment('auth.success', { role: user.role });
    return user;
  } catch (error: any) {
    logger.error('Authentication failed', { error: error.message });
    metricsCollector.increment('auth.failed', { reason: 'token_invalid' });
    return null;
  }
}

export function authorizeOperation(requiredPermissions: string[], requiredClearance?: string) {
  return (req: any, res: any, next: any) => {
    const authContext: AuthContext = {
      user: req.user || null, // Assuming req.user is populated by authenticateUser
      isAuthenticated: !!req.user,
      hasPermission: (permission: string) => {
        if (!req.user) return false;
        if (req.user.permissions.includes('all_permissions')) return true;
        return req.user.permissions.includes(permission);
      },
      hasClearance: (level: string) => {
        if (!req.user) return false;
        const userLevel = CLEARANCE_LEVELS[req.user.clearanceLevel.toUpperCase() as keyof typeof CLEARANCE_LEVELS];
        const requiredLevel = CLEARANCE_LEVELS[level.toUpperCase() as keyof typeof CLEARANCE_LEVELS];
        return userLevel >= requiredLevel;
      },
    };

    if (!authContext.isAuthenticated) {
      metricsCollector.increment('authz.failed', { reason: 'not_authenticated' });
      return res.status(401).json({ message: 'Unauthorized: Authentication required' });
    }

    if (requiredClearance && !authContext.hasClearance(requiredClearance)) {
      metricsCollector.increment('authz.failed', { reason: 'insufficient_clearance' });
      return res.status(403).json({ message: 'Forbidden: Insufficient clearance level' });
    }

    for (const perm of requiredPermissions) {
      if (!authContext.hasPermission(perm)) {
        metricsCollector.increment('authz.failed', { reason: 'insufficient_permissions' });
        return res.status(403).json({ message: `Forbidden: Missing required permission: ${perm}` });
      }
    }

    // Attach authContext to request for downstream use
    req.authContext = authContext;
    metricsCollector.increment('authz.success', { role: req.user.role });
    next();
  };
}