import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { randomUUID as uuidv4 } from 'node:crypto';
import { getPostgresPool } from '../config/database.js';
import config from '../config/index.js';
import logger from '../utils/logger.js';
// @ts-ignore - pg type imports
import { Pool, PoolClient } from 'pg';

/**
 * User registration data structure
 */
interface UserData {
  /** User's email address (required, must be unique) */
  email: string;
  /** Username (optional, must be unique if provided) */
  username?: string;
  /** Plain text password (will be hashed before storage) */
  password: string;
  /** User's first name */
  firstName?: string;
  /** User's last name */
  lastName?: string;
  /** User role (defaults to 'ANALYST' if not specified) */
  role?: string;
}

/**
 * User data structure returned from API
 */
interface User {
  /** Unique user identifier (UUID) */
  id: string;
  /** User's email address */
  email: string;
  /** Username (optional) */
  username?: string;
  /** User's first name */
  firstName?: string;
  /** User's last name */
  lastName?: string;
  /** Combined first and last name */
  fullName?: string;
  /** User's role (ADMIN, ANALYST, VIEWER) */
  role: string;
  /** Whether the user account is active */
  isActive: boolean;
  /** Timestamp of last successful login */
  lastLogin?: Date;
  /** Account creation timestamp */
  createdAt: Date;
  /** Last account update timestamp */
  updatedAt?: Date;
}

/**
 * Internal database representation of user
 */
interface DatabaseUser {
  id: string;
  email: string;
  username?: string;
  /** Argon2 hashed password */
  password_hash: string;
  first_name?: string;
  last_name?: string;
  role: string;
  is_active: boolean;
  last_login?: Date;
  created_at: Date;
  updated_at?: Date;
}

/**
 * Authentication response structure
 */
interface AuthResponse {
  /** User data */
  user: User;
  /** JWT access token */
  token: string;
  /** Refresh token for obtaining new access tokens */
  refreshToken: string;
  /** Token expiration time in seconds */
  expiresIn: number;
}

/**
 * JWT token payload structure
 */
interface TokenPayload {
  /** User ID */
  userId: string;
  /** User email */
  email: string;
  /** User role for authorization */
  role: string;
}

/**
 * Token pair returned during authentication
 */
interface TokenPair {
  /** JWT access token */
  token: string;
  /** Refresh token */
  refreshToken: string;
}

/**
 * Role-based permissions mapping
 * Defines what operations each role is authorized to perform
 */
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
  ],
  VIEWER: [
    'investigation:read',
    'entity:read',
    'relationship:read',
    'tag:read',
    'graph:read',
    'graph:export',
  ],
};

/**
 * Authentication Service
 *
 * Provides comprehensive user authentication and authorization functionality including:
 * - User registration with password hashing (Argon2)
 * - Login with JWT token generation
 * - Token verification and refresh
 * - Role-based access control (RBAC)
 * - Session management
 * - Password updates and account management
 *
 * @example
 * ```typescript
 * const authService = new AuthService();
 *
 * // Register a new user
 * const { user, token } = await authService.register({
 *   email: 'analyst@example.com',
 *   password: 'securePassword123',
 *   role: 'ANALYST'
 * });
 *
 * // Login
 * const authResponse = await authService.login('analyst@example.com', 'securePassword123');
 *
 * // Verify token
 * const user = await authService.verifyToken(token);
 * ```
 */
export class AuthService {
  private pool: Pool;

  constructor() {
    this.pool = getPostgresPool();
  }

  /**
   * Register a new user account
   *
   * Creates a new user with hashed password (Argon2), generates authentication tokens,
   * and stores session information. The operation is transactional to ensure data consistency.
   *
   * @param userData - User registration data including email, password, and optional profile info
   * @returns Authentication response with user data, access token, and refresh token
   * @throws {Error} If user with email/username already exists
   * @throws {Error} If database transaction fails
   *
   * @example
   * ```typescript
   * const response = await authService.register({
   *   email: 'analyst@example.com',
   *   username: 'analyst1',
   *   password: 'securePassword123',
   *   firstName: 'John',
   *   lastName: 'Doe',
   *   role: 'ANALYST'
   * });
   * ```
   */
  async register(userData: UserData): Promise<AuthResponse> {
    const client = await this.pool.connect();

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

  /**
   * Authenticate user and create session
   *
   * Verifies user credentials, updates last login timestamp, and generates new
   * authentication tokens. IP address and user agent can be logged for security auditing.
   *
   * @param email - User's email address
   * @param password - Plain text password (will be verified against stored hash)
   * @param ipAddress - Optional IP address for audit logging
   * @param userAgent - Optional user agent for audit logging
   * @returns Authentication response with user data and tokens
   * @throws {Error} If credentials are invalid
   * @throws {Error} If user account is inactive
   *
   * @example
   * ```typescript
   * const response = await authService.login(
   *   'analyst@example.com',
   *   'password123',
   *   '192.168.1.1',
   *   'Mozilla/5.0...'
   * );
   * ```
   */
  async login(
    email: string,
    password: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResponse> {
    const client = await this.pool.connect();

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

      await client.query(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
        [user.id],
      );

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

  /**
   * Generate JWT access token and refresh token
   *
   * Creates a signed JWT with user claims and a UUID refresh token.
   * Stores the refresh token in the database with 7-day expiration.
   *
   * @param user - Database user object
   * @param client - PostgreSQL client for session storage
   * @returns Token pair containing access and refresh tokens
   * @private
   */
  private async generateTokens(
    user: DatabaseUser,
    client: PoolClient,
  ): Promise<TokenPair> {
    const tokenPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    // @ts-ignore - jwt.sign overload mismatch
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

  /**
   * Verify JWT access token and retrieve user
   *
   * Validates the token signature and expiration, then retrieves the
   * current user data from the database. Returns null if token is invalid
   * or user is inactive.
   *
   * @param token - JWT access token to verify
   * @returns User object if valid, null otherwise
   *
   * @example
   * ```typescript
   * const user = await authService.verifyToken(req.headers.authorization);
   * if (!user) {
   *   throw new Error('Unauthorized');
   * }
   * ```
   */
  async verifyToken(token: string): Promise<User | null> {
    try {
      if (!token) return null;

      const decoded = jwt.verify(token, config.jwt.secret) as TokenPayload;

      const client = await this.pool.connect();
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

  hasPermission(user: User | null, permission: string): boolean {
    if (!user || !user.role) return false;
    const userPermissions = ROLE_PERMISSIONS[user.role.toUpperCase()];
    if (!userPermissions) return false;
    if (userPermissions.includes('*')) return true; // Admin or super role
    return userPermissions.includes(permission);
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
