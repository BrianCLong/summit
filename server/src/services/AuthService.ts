import { getAuditSystem } from '../audit/advanced-audit-system.js';
import { randomUUID } from 'crypto';
// @ts-nocheck
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

import { getPostgresPool } from '../config/database.js';
import { cfg } from '../config.js';
import logger from '../utils/logger.js';
import { secretsService } from './SecretsService.js';
import { SECRETS } from '../config/secretRefs.js';
import type { Pool, PoolClient } from 'pg';
import GAEnrollmentService from './GAEnrollmentService.js';
import { PrometheusMetrics } from '../utils/metrics.js';
import { checkScope } from '../api/scopeGuard.js';
import { securityService as defaultSecurityService, SecurityService } from './securityService.js';

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
  defaultTenantId?: string;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt?: Date;
  scopes: string[];
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
  default_tenant_id?: string;
  is_active: boolean;
  last_login?: Date;
  created_at: Date;
  updated_at?: Date;
  tenant_id?: string;
}

/**
 * Authentication response returned after successful login/register
 *
 * @interface AuthResponse
 * @property {User} user - The authenticated user object
 * @property {string} token - JWT access token (24h expiry by default)
 * @property {string} refreshToken - Refresh token for token rotation (7d expiry)
 * @property {number} expiresIn - Token expiration time in seconds
 */
interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * JWT token payload structure
 *
 * @interface TokenPayload
 * @property {string} userId - User's UUID
 * @property {string} email - User's email
 * @property {string} role - User's role for authorization
 * @property {string} tenantId - Tenant ID
 */
interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  tenantId: string;
  scp: string[];
}

/**
 * Token pair containing access and refresh tokens
 *
 * @interface TokenPair
 * @property {string} token - JWT access token
 * @property {string} refreshToken - UUID refresh token for rotation
 */
interface TokenPair {
  token: string;
  refreshToken: string;
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
    'support:read',
    'support:create',
    'support:update',
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
 * Role-based scope mappings for OAuth-style enforcement
 */
const ROLE_SCOPES: Record<string, string[]> = {
  ADMIN: [
    'read:graph',
    'write:case',
    'run:analytics',
    'export:*',
    'manage:keys',
  ],
  ANALYST: [
    'read:graph',
    'write:case',
    'run:analytics',
    'export:bundle',
  ],
  VIEWER: [
    'read:graph',
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
  /** PostgreSQL connection pool for database operations */
  private get pool(): Pool {
    return getPostgresPool() as unknown as Pool;
  }
  private metrics: PrometheusMetrics;
  private securityService: SecurityService;

  /**
   * @constructor
   * @description Creates an instance of AuthService.
   * Initializes the PostgreSQL connection pool and sets up Prometheus metrics for authentication events.
   */
  constructor(securityService: SecurityService = defaultSecurityService) {
    this.securityService = securityService;

    // Lazy initialized via getter
    try {
      this.metrics = new PrometheusMetrics('summit_auth');
      this.metrics.createHistogram(
        'user_registration_duration_seconds',
        'Time taken to register a user',
        { buckets: [0.1, 0.5, 1, 2, 5] }
      );
      this.metrics.createCounter(
        'user_logins_total',
        'Total number of user login attempts',
        ['tenant_id', 'result']
      );
      this.metrics.createCounter(
        'user_logouts_total',
        'Total number of user logouts',
        ['tenant_id']
      );
      this.metrics.createHistogram(
        'user_session_duration_seconds',
        'Duration of user sessions',
        { buckets: [60, 300, 900, 1800, 3600] }
      );
    } catch (e) {
      // Ignore if metrics fail to initialize
    }
  }

  /**
   * @method register
   * @description Registers a new user account.
   * Creates a new user, hashes the password using Argon2, and generates the initial JWT and refresh tokens.
   *
   * @param {UserData} userData - The user's registration data, including email, password, and name.
   * @returns {Promise<AuthResponse>} An object containing the new user's details and authentication tokens.
   * @throws {Error} Throws an error if a user with the same email or username already exists, or if the database operation fails.
   *
   * @example
   * ```typescript
   * const authResponse = await authService.register({
   *   email: 'new.user@example.com',
   *   password: 'a-very-secure-password',
   *   firstName: 'Jane',
   *   lastName: 'Doe',
   *   role: 'ANALYST'
   * });
   * console.log(authResponse.user.id);
   * console.log(authResponse.token);
   * ```
   */
  async register(userData: UserData): Promise<AuthResponse> {
    const start = process.hrtime();
    const client = await this.pool.connect();

    try {
      // GA Enrollment Check
      if (process.env.GA_ENROLLMENT_BYPASS !== 'true') {
        const enrollmentCheck = await GAEnrollmentService.checkUserEnrollmentEligibility(userData.email);
        if (!enrollmentCheck.eligible) {
          this.metrics?.observeHistogram('user_registration_duration_seconds', { status: 'rejected_enrollment' }, 0);
          throw new Error(`Registration rejected: ${enrollmentCheck.reason}`);
        }
      }

      await client.query('BEGIN');

      const existingUser = await client.query(
        'SELECT id FROM users WHERE email = $1 OR username = $2',
        [userData.email, userData.username],
      );

      if (existingUser.rows.length > 0) {
        throw new Error('User with this email or username already exists');
      }

      const hashedPassword = await this.securityService.hashPassword(userData.password);

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

      // Auto-assign to default tenant if configured or just 'global'
      // This ensures the new user has at least one tenant membership
      await client.query(
        `INSERT INTO user_tenants (user_id, tenant_id, roles)
         VALUES ($1, 'global', $2)
         ON CONFLICT DO NOTHING`,
        [user.id, [user.role]]
      );

      const { token, refreshToken } = await this.generateTokens(user, client);

      await client.query('COMMIT');

      const [seconds, nanoseconds] = process.hrtime(start);
      const duration = seconds + nanoseconds / 1e9;
      this.metrics?.observeHistogram('user_registration_duration_seconds', { status: 'success' }, duration);

      return {
        user: this.formatUser(user),
        token,
        refreshToken,
        expiresIn: 24 * 60 * 60,
      };
    } catch (error: any) {
      await client.query('ROLLBACK');
      logger.error('Error registering user:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * @method externalLogin
   * @description Logs in a user via an external provider (e.g., SSO).
   * This method trusts the caller and does not verify a password. It finds the user by email
   * and generates authentication tokens.
   *
   * @param {string} email - The email of the user to log in.
   * @returns {Promise<AuthResponse>} An object containing the user's details and authentication tokens.
   * @throws {Error} Throws an error if the user is not found.
   */
  async externalLogin(email: string): Promise<AuthResponse> {
    const client = await this.pool.connect();
    let tenantId = 'unknown';

    try {
      const userResult = await client.query(
        'SELECT * FROM users WHERE email = $1 AND is_active = true',
        [email],
      );

      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = userResult.rows[0] as DatabaseUser;
      tenantId = user.tenant_id || 'unknown';

      await client.query(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
        [user.id],
      );

      const { token, refreshToken } = await this.generateTokens(user, client);

      this.metrics.incrementCounter('user_logins_total', { tenant_id: tenantId, result: 'success_sso' });

      return {
        user: this.formatUser(user),
        token,
        refreshToken,
        expiresIn: 24 * 60 * 60,
      };
    } catch (error: any) {
      logger.error('Error logging in user via SSO:', error);
      this.metrics.incrementCounter('user_logins_total', { tenant_id: tenantId, result: 'failure_sso' });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * @method login
   * @description Authenticates a user with their email and password.
   * It verifies the password against the stored hash, updates the last login timestamp, and generates new tokens.
   *
   * @param {string} email - The user's email address.
   * @param {string} password - The user's plain text password.
   * @param {string} [ipAddress] - Optional client IP address for audit logging.
   * @param {string} [userAgent] - Optional client user agent for audit logging.
   * @returns {Promise<AuthResponse>} An object containing the user's details and authentication tokens.
   * @throws {Error} Throws 'Invalid credentials' if the email is not found or the password does not match.
   *
   * @example
   * ```typescript
   * try {
   *   const auth = await authService.login('user@example.com', 'password123');
   *   // Store auth.token and auth.refreshToken securely
   * } catch (error: any) {
   *   console.error('Login failed:', error.message);
   * }
   * ```
   *
   * @trace REQ-AUTH-001
   */
  async login(
    email: string,
    password: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResponse> {
    const client = await this.pool.connect();
    let tenantId = 'unknown';

    try {
      const userResult = await client.query(
        'SELECT * FROM users WHERE email = $1 AND is_active = true',
        [email],
      );

      if (userResult.rows.length === 0) {
        throw new Error('Invalid credentials');
      }

      const user = userResult.rows[0] as DatabaseUser;
      tenantId = user.tenant_id || 'unknown';
      const validPassword = await this.securityService.verifyPassword(user.password_hash, password);

      if (!validPassword) {
        throw new Error('Invalid credentials');
      }

      await client.query(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
        [user.id],
      );

      const { token, refreshToken } = await this.generateTokens(user, client);

      this.metrics.incrementCounter('user_logins_total', { tenant_id: tenantId, result: 'success' });

      // Audit Log
      try {
        getAuditSystem().recordEvent({
          id: randomUUID(),
          eventType: 'user_login',
          level: 'info',
          timestamp: new Date(),
          correlationId: randomUUID(),
          userId: user.id,
          tenantId: tenantId,
          serviceId: 'auth-service',
          resourceType: 'user',
          resourceId: user.id,
          action: 'login',
          outcome: 'success',
          message: `User ${user.email} logged in successfully`,
          complianceRelevant: true,
          complianceFrameworks: ['SOC2', 'GDPR'],
          ipAddress,
          userAgent
        });
      } catch (e) {
        logger.error('Failed to log audit event', e);
      }
      return {
        user: this.formatUser(user),
        token,
        refreshToken,
        expiresIn: 24 * 60 * 60,
      };
    } catch (error: any) {
      logger.error('Error logging in user:', error);
      this.metrics.incrementCounter('user_logins_total', { tenant_id: tenantId, result: 'failure' });

      // Audit Log Failure
      try {
        getAuditSystem().recordEvent({
          id: randomUUID(),
          eventType: 'user_login',
          level: 'warn',
          timestamp: new Date(),
          correlationId: randomUUID(),
          tenantId: tenantId,
          serviceId: 'auth-service',
          resourceType: 'user',
          resourceId: email,
          action: 'login',
          outcome: 'failure',
          message: `Login failed for ${email}: ${error.message}`,
          complianceRelevant: true,
          complianceFrameworks: ['SOC2'],
          ipAddress,
          userAgent,
          details: { error: error.message }
        });
      } catch {
         // Intentionally ignore audit logging failures to preserve auth flow.
      }
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * @method generateTokens
   * @description Generates a new JWT and refresh token pair for a user.
   * The JWT is signed with the user's essential details, and the refresh token is stored in the database.
   *
   * @param {DatabaseUser} user - The user object from the database.
   * @param {PoolClient} client - The PostgreSQL client to use for the database transaction.
   * @returns {Promise<TokenPair>} An object containing the new JWT and refresh token.
   */
  async generateTokens(
    user: DatabaseUser,
    client: PoolClient,
  ): Promise<TokenPair> {
    const userScopes = ROLE_SCOPES[user.role.toUpperCase()] || [];
    return this.securityService.generateDbTokenPair(user, client, userScopes);
  }

  /**
   * @method verifyToken
   * @description Verifies a JWT. It checks the token's signature, expiry, and whether it has been blacklisted.
   *
   * @param {string} token - The JWT to verify.
   * @returns {Promise<User | null>} The user object if the token is valid, otherwise null.
   *
   * @example
   * ```typescript
   * const user = await authService.verifyToken(request.headers.authorization.split(' ')[1]);
   * if (!user) {
   *   // Handle unauthorized access
   * }
   * ```
   */
  async verifyToken(token: string): Promise<User | null> {
    try {
      if (!token) return null;

      // Development mode bypass
      if (process.env.NODE_ENV === 'development' && token === 'dev-token') {
        return {
          id: 'dev-user-1',
          email: 'developer@intelgraph.com',
          username: 'developer',
          role: 'ADMIN',
          isActive: true,
          createdAt: new Date(),
          scopes: ['*'],
          tenantId: 'tenant_1',
        };
      }

      const decoded = await this.securityService.verifyDbToken(token, this.pool);
      if (!decoded) return null;

      const client = await this.pool.connect();
      const userResult = await client.query(
        'SELECT * FROM users WHERE id = $1 AND is_active = true',
        [decoded.userId],
      );
      client.release();

      if (userResult.rows.length === 0) {
        return null;
      }

      const user = this.formatUser(userResult.rows[0] as DatabaseUser);
      // Fallback to role-based scopes if scp claim is missing (legacy tokens)
      user.scopes = decoded.scp || ROLE_SCOPES[user.role.toUpperCase()] || [];
      return user;
    } catch (error: any) {
      logger.warn('Invalid token:', error.message);
      return null;
    }
  }

  /**
   * @method refreshAccessToken
   * @description Refreshes a user's access token using a refresh token.
   * It implements token rotation by invalidating the old refresh token and issuing a new pair.
   *
   * @param {string} refreshToken - The refresh token to use.
   * @returns {Promise<TokenPair | null>} A new token pair if the refresh token is valid, otherwise null.
   */
  async refreshAccessToken(refreshToken: string): Promise<TokenPair | null> {
    const client = await this.pool.connect();

    try {
      const getScopes = (role: string) => ROLE_SCOPES[role.toUpperCase()] || [];
      const result = await this.securityService.refreshDbToken(refreshToken, client, getScopes);

      if (!result) return null;

      logger.info('Token successfully refreshed with rotation', {
        userId: result.userId,
      });

      return { token: result.token, refreshToken: result.refreshToken };
    } catch (error: any) {
      logger.error('Error refreshing token:', error);
      return null;
    } finally {
      client.release();
    }
  }

  /**
   * @method revokeToken
   * @description Revokes an access token by adding its hash to a blacklist.
   *
   * @param {string} token - The JWT to revoke.
   * @returns {Promise<boolean>} True if the token was successfully blacklisted, false otherwise.
   */
  async revokeToken(token: string): Promise<boolean> {
    return this.securityService.revokeToken(token, this.pool);
  }

  /**
   * @method logout
   * @description Logs out a user by revoking all their active sessions and, optionally, the current access token.
   *
   * @param {string} userId - The ID of the user to log out.
   * @param {string} [currentToken] - The user's current JWT to blacklist.
   * @returns {Promise<boolean>} True if the logout was successful, false otherwise.
   */
  async logout(userId: string, currentToken?: string): Promise<boolean> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Revoke all refresh tokens for user
      const result = await client.query(
        'UPDATE user_sessions SET is_revoked = true WHERE user_id = $1 RETURNING (SELECT tenant_id, last_login FROM users WHERE id = $1)',
        [userId],
      );

      const userData = result.rows[0];
      const tenantId = userData?.tenant_id || 'unknown';
      this.metrics.incrementCounter('user_logouts_total', { tenant_id: tenantId });

      if (userData?.last_login) {
        const sessionDuration = (new Date().getTime() - new Date(userData.last_login).getTime()) / 1000;
        this.metrics.observeHistogram('user_session_duration_seconds', sessionDuration, { tenant_id: tenantId });
      }

      // Blacklist current access token if provided
      if (currentToken) {
        await this.revokeToken(currentToken);
      }

      await client.query('COMMIT');

      logger.info('User logged out successfully', { userId });
      return true;
    } catch (error: any) {
      await client.query('ROLLBACK');
      logger.error('Error during logout:', error);
      return false;
    } finally {
      client.release();
    }
  }

  /**
   * @private
   * @method hashToken
   * @description Hashes a token for storage in the blacklist, to avoid storing raw tokens.
   *
   * @param {string} token - The token to hash.
   * @returns {string} The SHA256 hash of the token.
   */
  private hashToken(token: string): string {
    return this.securityService.hashToken(token);
  }

  /**
   * @method hasPermission
   * @description Checks if a user has a specific permission based on their role.
   * The ADMIN role has wildcard access to all permissions.
   *
   * @param {User | null} user - The user object to check.
   * @param {string} permission - The permission string to check for (e.g., 'investigation:create').
   * @returns {boolean} True if the user has the permission, false otherwise.
   *
   * @example
   * ```typescript
   * if (authService.hasPermission(currentUser, 'investigation:create')) {
   *   // Proceed with creating investigation
   * } else {
   *   // Deny access
   * }
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
   * Checks if a user has a specific scope.
   *
   * @param {User | null} user - The user object to check.
   * @param {string} scope - The scope string to check for (e.g., 'read:graph').
   * @returns {boolean} True if the user has the scope, false otherwise.
   */
  hasScope(user: User | null, scope: string): boolean {
    if (!user || !user.scopes) return false;
    return checkScope(user.scopes, scope);
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
      defaultTenantId: user.default_tenant_id,
      isActive: user.is_active,
      lastLogin: user.last_login,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      scopes: [],
    };
  }
}

export default AuthService;
