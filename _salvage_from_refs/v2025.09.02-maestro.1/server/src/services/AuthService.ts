import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { getPostgresPool } from '../config/database.js';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import { Pool, PoolClient } from 'pg';

interface UserData {
  email: string;
  username?: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role?: string;
}

interface User {
  id: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  role: string;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt?: Date;
}

interface DatabaseUser {
  id: string;
  email: string;
  username?: string;
  password_hash: string;
  first_name?: string;
  last_name?: string;
  role: string;
  is_active: boolean;
  last_login?: Date;
  created_at: Date;
  updated_at?: Date;
}

interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
  expiresIn: number;
}

interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

interface TokenPair {
  token: string;
  refreshToken: string;
}

// Define permissions for each role
const ROLE_PERMISSIONS: Record<string, string[]> = {
  ADMIN: [
    '*', // Admin has all permissions
  ],
  ANALYST: [
    'investigation:create',
    'investigation:read',
    'investigation:update',
    'entity:create',
    'entity:read',
    'entity:update',
    'entity:delete',
    'relationship:create',
    'relationship:read',
    'relationship:update',
    'relationship:delete',
    'tag:create',
    'tag:read',
    'tag:delete',
    'graph:read',
    'graph:export',
    'ai:request',
    // Maestro permissions
    'pipeline:create',
    'pipeline:read',
    'pipeline:update',
    'pipeline:execute',
    'run:create',
    'run:read',
    'run:update',
    'dashboard:read',
    'autonomy:read',
    'autonomy:update',
    'recipe:read',
    'executor:read',
  ],
  OPERATOR: [
    // Operations-focused role for pipeline management
    'pipeline:read',
    'pipeline:update',
    'pipeline:execute',
    'run:create',
    'run:read',
    'run:update',
    'run:cancel',
    'dashboard:read',
    'autonomy:read',
    'recipe:read',
    'executor:read',
    'executor:update',
  ],
  VIEWER: [
    'investigation:read',
    'entity:read',
    'relationship:read',
    'tag:read',
    'graph:read',
    'graph:export',
    // Read-only Maestro permissions
    'pipeline:read',
    'run:read',
    'dashboard:read',
    'autonomy:read',
    'recipe:read',
    'executor:read',
  ],
};

export class AuthService {
  private pool: Pool | null = null;

  private getPool(): Pool {
    if (!this.pool) {
      this.pool = getPostgresPool();
    }
    return this.pool;
  }

  async register(userData: UserData): Promise<AuthResponse> {
    const client = await this.getPool().connect();

    try {
      await client.query('BEGIN');

      const existingUser = await client.query(
        'SELECT id FROM users WHERE email = $1 OR username = $2',
        [userData.email, userData.username],
      );

      if (existingUser.rows.length > 0) {
        throw new Error('User with this email or username already exists');
      }

      const passwordHash = await argon2.hash(userData.password);

      const userResult = await client.query(
        `
        INSERT INTO users (email, username, password_hash, first_name, last_name, role)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, email, username, first_name, last_name, role, is_active, created_at
      `,
        [
          userData.email,
          userData.username,
          passwordHash,
          userData.firstName,
          userData.lastName,
          userData.role || 'ANALYST',
        ],
      );

      const user = userResult.rows[0] as DatabaseUser;
      const { token, refreshToken } = await this.generateTokens(user, client);

      await client.query('COMMIT');

      return {
        user: this.formatUser(user),
        token,
        refreshToken,
        expiresIn: 24 * 60 * 60,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error registering user:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async login(
    email: string,
    password: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResponse> {
    const client = await this.getPool().connect();

    try {
      const userResult = await client.query(
        'SELECT * FROM users WHERE email = $1 AND is_active = true',
        [email],
      );

      if (userResult.rows.length === 0) {
        throw new Error('Invalid credentials');
      }

      const user = userResult.rows[0] as DatabaseUser;
      const validPassword = await argon2.verify(user.password_hash, password);

      if (!validPassword) {
        throw new Error('Invalid credentials');
      }

      await client.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [
        user.id,
      ]);

      const { token, refreshToken } = await this.generateTokens(user, client);

      return {
        user: this.formatUser(user),
        token,
        refreshToken,
        expiresIn: 24 * 60 * 60,
      };
    } catch (error) {
      logger.error('Error logging in user:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  private async generateTokens(user: DatabaseUser, client: PoolClient): Promise<TokenPair> {
    const tokenPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const token = jwt.sign(tokenPayload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });

    const refreshToken = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await client.query(
      `
      INSERT INTO user_sessions (user_id, refresh_token, expires_at)
      VALUES ($1, $2, $3)
    `,
      [user.id, refreshToken, expiresAt],
    );

    return { token, refreshToken };
  }

  async verifyToken(token: string): Promise<User | null> {
    try {
      if (!token) return null;

      const decoded = jwt.verify(token, config.jwt.secret) as TokenPayload;

      const client = await this.getPool().connect();
      const userResult = await client.query(
        'SELECT * FROM users WHERE id = $1 AND is_active = true',
        [decoded.userId],
      );
      client.release();

      if (userResult.rows.length === 0) {
        return null;
      }

      return this.formatUser(userResult.rows[0] as DatabaseUser);
    } catch (error: any) {
      logger.warn('Invalid token:', error.message);
      return null;
    }
  }

  /**
   * Check if a user has a specific permission
   */
  hasPermission(user: User, permission: string): boolean {
    if (!user || !user.role || !user.isActive) {
      return false;
    }

    const userPermissions = ROLE_PERMISSIONS[user.role.toUpperCase()] || [];

    // Admin has wildcard permission
    if (userPermissions.includes('*')) {
      return true;
    }

    // Check exact permission match
    if (userPermissions.includes(permission)) {
      return true;
    }

    // Check wildcard permissions (e.g., 'investigation:*' matches 'investigation:create')
    const wildcardPermissions = userPermissions.filter((p) => p.endsWith(':*'));
    const permissionPrefix = permission.split(':')[0];

    for (const wildcardPerm of wildcardPermissions) {
      const wildcardPrefix = wildcardPerm.replace(':*', '');
      if (permissionPrefix === wildcardPrefix) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if a user has any of the specified permissions
   */
  hasAnyPermission(user: User, permissions: string[]): boolean {
    return permissions.some((permission) => this.hasPermission(user, permission));
  }

  /**
   * Check if a user has all of the specified permissions
   */
  hasAllPermissions(user: User, permissions: string[]): boolean {
    return permissions.every((permission) => this.hasPermission(user, permission));
  }

  /**
   * Get all permissions for a user
   */
  getUserPermissions(user: User): string[] {
    if (!user || !user.role || !user.isActive) {
      return [];
    }

    return ROLE_PERMISSIONS[user.role.toUpperCase()] || [];
  }

  private formatUser(user: DatabaseUser): User {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.first_name,
      lastName: user.last_name,
      fullName: `${user.first_name} ${user.last_name}`,
      role: user.role,
      isActive: user.is_active,
      lastLogin: user.last_login,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };
  }
}

export default AuthService;
