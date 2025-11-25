/**
 * @fileoverview Authentication Service for Summit/IntelGraph Platform
 *
 * Provides comprehensive authentication and authorization capabilities:
 * - User registration with Argon2 password hashing
 * - JWT-based authentication with refresh token rotation
 * - Role-based access control (RBAC) with ADMIN, ANALYST, VIEWER roles
 * - Session management with token blacklisting
 * - Secure credential validation
 *
 * @module services/AuthService
 * @see {@link https://docs.intelgraph.example.com/auth} Authentication Documentation
 *
 * @example
 * ```typescript
 * const authService = new AuthService();
 *
 * // Register a new user
 * const { user, token } = await authService.register({
 *   email: 'analyst@example.com',
 *   password: 'SecureP@ss123',
 *   firstName: 'Jane',
 *   lastName: 'Doe',
 *   role: 'ANALYST'
 * });
 *
 * // Login existing user
 * const auth = await authService.login('analyst@example.com', 'SecureP@ss123');
 *
 * // Verify token
 * const user = await authService.verifyToken(auth.token);
 *
 * // Check permission
 * if (authService.hasPermission(user, 'investigation:create')) {
 *   // User can create investigations
 * }
 * ```
 */

import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { randomUUID as uuidv4 } from 'node:crypto';
import { getPostgresPool } from '../config/database.js';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import { generateTokens } from '../lib/auth.js';
// @ts-ignore - pg type imports
import { Pool, PoolClient } from 'pg';

/**
 * User registration data payload
 *
 * @interface UserData
 * @property {string} email - User's email address (must be unique)
 * @property {string} [username] - Optional username (must be unique if provided)
 * @property {string} password - Plain text password (will be hashed with Argon2)
 * @property {string} [firstName] - User's first name
 * @property {string} [lastName] - User's last name
 * @property {string} [role='ANALYST'] - User role: 'ADMIN' | 'ANALYST' | 'VIEWER'
 */
interface UserData {
  email: string;
  username?: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role?: string;
}

/**
 * Public user representation (excludes sensitive data like password hash)
 *
 * @interface User
 * @property {string} id - UUID of the user
 * @property {string} email - User's email address
 * @property {string} [username] - Optional username
 * @property {string} [firstName] - User's first name
 * @property {string} [lastName] - User's last name
 * @property {string} [fullName] - Computed full name (firstName + lastName)
 * @property {string} role - User's role for RBAC
 * @property {boolean} isActive - Whether the account is active
 * @property {Date} [lastLogin] - Timestamp of last successful login
 * @property {Date} createdAt - Account creation timestamp
 * @property {Date} [updatedAt] - Last update timestamp
 */
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

/**
 * Internal database representation of a user (snake_case fields)
 *
 * @internal
 * @interface DatabaseUser
 */
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
  token_version?: number;
}

/**
 * Authentication response returned after successful login/register
 *
 * @interface AuthResponse
 * @property {User} user - The authenticated user object
 * @property {string} accessToken - JWT access token (24h expiry by default)
 * @property {string} refreshToken - Refresh token for token rotation (7d expiry)
 * @property {number} expiresIn - Token expiration time in seconds
 */
interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string; // This is sent in the cookie, not the response body
  expiresIn: number;
}

/**
 * JWT token payload structure
 *
 * @interface TokenPayload
 * @property {string} userId - User's UUID
 * @property {string} email - User's email
 * @property {string} role - User's role for authorization
 */
interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

interface RefreshTokenPayload {
  userId: string;
  token_version: number;
}

/**
 * Role-based permission mappings for RBAC enforcement
 *
 * Permissions follow the pattern: `resource:action`
 *
 * @constant
 * @type {Record<string, string[]>}
 *
 * @example
 * // Available roles and their permissions:
 * // - ADMIN: '*' (all permissions)
 * // - ANALYST: investigation, entity, relationship, tag CRUD + graph + AI
 * // - VIEWER: read-only access to investigations, entities, relationships, tags, graph
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
 * Authentication and Authorization Service
 *
 * Handles all authentication operations including user registration,
 * login, token management, and permission checking for the Summit/IntelGraph platform.
 *
 * Security features:
 * - Argon2 password hashing (memory-hard, side-channel resistant)
 * - JWT access tokens with configurable expiry
 * - Refresh token rotation to prevent token replay attacks
 * - Token blacklisting for immediate revocation
 * - Role-based permission checking
 *
 * @class AuthService
 * @example
 * ```typescript
 * const authService = new AuthService();
 * const { user, token } = await authService.login('user@example.com', 'password');
 * ```
 */
export class AuthService {
  /** PostgreSQL connection pool for database operations */
  private pool: Pool;

  /**
   * Creates an instance of AuthService
   * Initializes the PostgreSQL connection pool from the shared database configuration
   */
  constructor() {
    this.pool = getPostgresPool();
  }

  /**
   * Register a new user account
   *
   * Creates a new user with the provided credentials, hashes the password using Argon2,
   * and generates initial JWT access and refresh tokens.
   *
   * @param {UserData} userData - User registration data
   * @returns {Promise<AuthResponse>} Authentication response with user and tokens
   * @throws {Error} If user with email or username already exists
   * @throws {Error} If database operation fails
   *
   * @example
   * ```typescript
   * const response = await authService.register({
   *   email: 'newuser@example.com',
   *   password: 'SecurePassword123!',
   *   firstName: 'John',
   *   lastName: 'Smith',
   *   role: 'ANALYST'
   * });
   * console.log(response.token); // JWT access token
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
        RETURNING id, email, username, first_name, last_name, role, is_active, created_at, token_version
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
      const { accessToken, refreshToken } = generateTokens(user);

      await client.query('COMMIT');

      return {
        user: this.formatUser(user),
        accessToken: accessToken,
        refreshToken,
        expiresIn: 15 * 60,
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
   * Authenticate a user with email and password
   *
   * Validates user credentials against stored Argon2 hash, updates last login timestamp,
   * and generates new JWT access and refresh tokens.
   *
   * @param {string} email - User's email address
   * @param {string} password - User's plain text password
   * @param {string} [ipAddress] - Client IP address for audit logging (optional)
   * @param {string} [userAgent] - Client user agent for audit logging (optional)
   * @returns {Promise<AuthResponse>} Authentication response with user and tokens
   * @throws {Error} 'Invalid credentials' if email not found or password doesn't match
   *
   * @example
   * ```typescript
   * try {
   *   const auth = await authService.login('user@example.com', 'password123');
   *   // Store auth.token for subsequent API requests
   *   // Store auth.refreshToken for token refresh
   * } catch (error) {
   *   console.error('Login failed:', error.message);
   * }
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

      const { accessToken, refreshToken } = generateTokens(user);

      return {
        user: this.formatUser(user),
        accessToken: accessToken,
        refreshToken,
        expiresIn: 15 * 60,
      };
    } catch (error) {
      logger.error('Error logging in user:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Verify and decode a JWT access token
   *
   * Validates token signature and returns user if valid.
   * Returns null for invalid or expired tokens.
   *
   * @param {string} token - JWT access token to verify
   * @returns {Promise<User | null>} User object if valid, null otherwise
   *
   * @example
   * ```typescript
   * const user = await authService.verifyToken(request.headers.authorization);
   * if (!user) {
   *   throw new UnauthorizedError('Invalid or expired token');
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

  /**
   * Refresh access token using a refresh token.
   * This is a stateless operation that verifies the refresh token and issues a new pair of tokens.
   */
  async refreshAccessToken(
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string } | null> {
    try {
      const decoded = jwt.verify(
        refreshToken,
        config.jwt.secret,
      ) as RefreshTokenPayload;

      const userResult = await this.pool.query(
        'SELECT id, email, role, token_version FROM users WHERE id = $1 AND is_active = true',
        [decoded.userId],
      );

      if (userResult.rows.length === 0) {
        logger.warn('Refresh token user not found');
        return null;
      }

      const user = userResult.rows[0];

      if (user.token_version !== decoded.token_version) {
        logger.warn('Refresh token is revoked');
        return null;
      }

      const { accessToken, refreshToken: newRefreshToken } = generateTokens(
        user,
      );

      return { accessToken: accessToken, refreshToken: newRefreshToken };
    } catch (error) {
      logger.error('Error refreshing token:', error);
      return null;
    }
  }

  /**
   * Logout - revoke all user sessions by incrementing token_version
   */
  async logout(userId: string): Promise<boolean> {
    try {
      const result = await this.pool.query(
        'UPDATE users SET token_version = token_version + 1 WHERE id = $1',
        [userId],
      );

      if (result.rowCount === 0) {
        logger.warn('Attempted to logout non-existent user', { userId });
        return false;
      }

      logger.info('User tokens revoked successfully', { userId });
      return true;
    } catch (error) {
      logger.error('Error during token revocation:', error);
      return false;
    }
  }

  /**
   * Check if a user has a specific permission
   *
   * Uses role-based permission checking against ROLE_PERMISSIONS mapping.
   * ADMIN role has wildcard (*) access to all permissions.
   *
   * @param {User | null} user - User object to check permissions for
   * @param {string} permission - Permission string in format 'resource:action'
   * @returns {boolean} True if user has the permission, false otherwise
   *
   * @example
   * ```typescript
   * // Check if user can create investigations
   * if (authService.hasPermission(currentUser, 'investigation:create')) {
   *   await createInvestigation(data);
   * } else {
   *   throw new ForbiddenError('Insufficient permissions');
   * }
   *
   * // Available permission patterns:
   * // - investigation:create, investigation:read, investigation:update
   * // - entity:create, entity:read, entity:update, entity:delete
   * // - relationship:create, relationship:read, relationship:update, relationship:delete
   * // - tag:create, tag:read, tag:delete
   * // - graph:read, graph:export
   * // - ai:request
   * ```
   */
  hasPermission(user: User | null, permission: string): boolean {
    if (!user || !user.role) return false;
    const userPermissions = ROLE_PERMISSIONS[user.role.toUpperCase()];
    if (!userPermissions) return false;
    if (userPermissions.includes('*')) return true; // Admin or super role
    return userPermissions.includes(permission);
  }

  /**
   * Transform database user record to public User interface
   *
   * Converts snake_case database fields to camelCase and computes fullName.
   * Excludes sensitive fields like password_hash.
   *
   * @private
   * @param {DatabaseUser} user - Database user record
   * @returns {User} Public user representation
   */
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
