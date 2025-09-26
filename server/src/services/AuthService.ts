import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { randomUUID as uuidv4 } from 'crypto';
import { getPostgresPool } from '../config/database.js';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import { Pool, PoolClient } from 'pg';
import { getRbacService } from './rbac/RbacService.js';

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
  roles?: string[];
  permissions?: string[];
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

const PERMISSION_WILDCARD = '*';

export class AuthService {
  private pool: Pool | null = null;
  private rbac = getRbacService();

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

      let access;
      try {
        await this.rbac.assignRoleToUserByName(user.id, user.role || 'ANALYST');
        access = await this.rbac.getUserAccess(user.id, user.role);
      } catch (error) {
        logger.warn('Failed to synchronize RBAC assignment for new user', { error });
      }

      return {
        user: this.formatUser(user, access),
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
      const access = await this.rbac.getUserAccess(user.id, user.role, client);

      return {
        user: this.formatUser(user, access),
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

  /**
   * Issue JWT and refresh token for an already authenticated (OIDC/SSO) user.
   */
  async loginOIDC(email: string): Promise<AuthResponse> {
    const client = await this.getPool().connect();
    try {
      const userResult = await client.query(
        'SELECT * FROM users WHERE email = $1 AND is_active = true',
        [email],
      );
      if (userResult.rows.length === 0) {
        throw new Error('User not found or inactive');
      }
      const user = userResult.rows[0] as DatabaseUser;
      await client.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [
        user.id,
      ]);
      const { token, refreshToken } = await this.generateTokens(user, client);
      const access = await this.rbac.getUserAccess(user.id, user.role, client);
      return {
        user: this.formatUser(user, access),
        token,
        refreshToken,
        expiresIn: 24 * 60 * 60,
      };
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

      const databaseUser = userResult.rows[0] as DatabaseUser;
      const access = await this.rbac.getUserAccess(databaseUser.id, databaseUser.role);

      return this.formatUser(databaseUser, access);
    } catch (error: any) {
      logger.warn('Invalid token:', error.message);
      return null;
    }
  }

  /**
   * Check if a user has a specific permission
   */
  hasPermission(user: User, permission: string): boolean {
    if (!user || !user.isActive) {
      return false;
    }

    const permissionList = (user.permissions ?? []).map((perm) => perm.toLowerCase());
    if (permissionList.includes(PERMISSION_WILDCARD)) {
      return true;
    }

    const normalized = permission.toLowerCase();
    if (permissionList.includes(normalized)) {
      return true;
    }

    return permissionList.some(
      (perm) => perm.endsWith('.*') && normalized.startsWith(perm.substring(0, perm.length - 2)),
    );
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
    if (!user || !user.isActive) {
      return [];
    }

    return [...(user.permissions ?? [])];
  }

  private formatUser(
    user: DatabaseUser,
    access?: { roles?: string[]; permissions?: string[] },
  ): User {
    const primaryRole = user.role ? user.role.toUpperCase() : 'VIEWER';
    const normalizedRoles = (access?.roles ?? []).map((role) => role.toUpperCase());
    const roles = Array.from(new Set(normalizedRoles.length ? normalizedRoles : [primaryRole]));
    const permissions = access?.permissions?.length
      ? Array.from(new Set(access.permissions.map((perm) => perm.toLowerCase())))
      : [];

    const firstName = user.first_name ?? '';
    const lastName = user.last_name ?? '';
    const fullName = `${firstName} ${lastName}`.trim();

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.first_name,
      lastName: user.last_name,
      fullName: fullName || undefined,
      role: roles[0] || primaryRole,
      roles,
      permissions,
      isActive: user.is_active,
      lastLogin: user.last_login,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };
  }
}

export default AuthService;
