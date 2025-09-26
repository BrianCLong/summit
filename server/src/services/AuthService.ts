import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { randomUUID as uuidv4 } from 'crypto';
import { Pool, PoolClient } from 'pg';
import { getPostgresPool } from '../config/database.js';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import { sessionStore, ActiveSessionRecord } from './sessionStore.js';

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
  session: ActiveSessionRecord;
}

interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  sessionId: string;
}

interface TokenPair {
  token: string;
  refreshToken: string;
  session: ActiveSessionRecord;
}

interface SessionContext {
  ipAddress?: string;
  userAgent?: string;
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
  private readonly idleTimeoutMs: number = parseInt(
    process.env.SESSION_IDLE_TIMEOUT_MS || String(15 * 60 * 1000),
    10,
  );

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
      const { token, refreshToken, session } = await this.generateTokens(user, client);

      await client.query('COMMIT');

      return {
        user: this.formatUser(user),
        token,
        refreshToken,
        expiresIn: 24 * 60 * 60,
        session,
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

      const { token, refreshToken, session } = await this.generateTokens(user, client, {
        ipAddress,
        userAgent,
      });

      return {
        user: this.formatUser(user),
        token,
        refreshToken,
        expiresIn: 24 * 60 * 60,
        session,
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
      const { token, refreshToken, session } = await this.generateTokens(user, client);
      return {
        user: this.formatUser(user),
        token,
        refreshToken,
        expiresIn: 24 * 60 * 60,
        session,
      };
    } finally {
      client.release();
    }
  }

  private async generateTokens(
    user: DatabaseUser,
    client: PoolClient,
    context: SessionContext = {},
  ): Promise<TokenPair> {
    const sessionId = uuidv4();
    const refreshTokenId = uuidv4();
    const issuedAt = new Date();
    const refreshTtlMs = this.getRefreshTtlMs();
    const expiresAt = new Date(issuedAt.getTime() + refreshTtlMs);

    const tokenPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionId,
    };

    const token = jwt.sign(tokenPayload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });

    const refreshToken = jwt.sign(
      {
        sub: user.id,
        sid: sessionId,
        jti: refreshTokenId,
        type: 'refresh',
      },
      config.jwt.refreshSecret,
      {
        expiresIn: config.jwt.refreshExpiresIn,
      },
    );

    const refreshTokenHash = sessionStore.hashRefreshToken(refreshToken);

    await client.query(
      `
      INSERT INTO user_sessions (session_id, user_id, refresh_token, expires_at, ip_address, user_agent, revoked, last_used)
      VALUES ($1, $2, $3, $4, $5, $6, FALSE, $7)
      ON CONFLICT (session_id) DO UPDATE
        SET refresh_token = EXCLUDED.refresh_token,
            expires_at = EXCLUDED.expires_at,
            ip_address = EXCLUDED.ip_address,
            user_agent = EXCLUDED.user_agent,
            revoked = FALSE,
            last_used = EXCLUDED.last_used
    `,
      [
        sessionId,
        user.id,
        refreshTokenHash,
        expiresAt,
        context.ipAddress ?? null,
        context.userAgent ?? null,
        issuedAt,
      ],
    );

    const session: ActiveSessionRecord = {
      sessionId,
      userId: user.id,
      refreshTokenId,
      refreshTokenHash,
      createdAt: issuedAt.toISOString(),
      lastActivityAt: issuedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      ipAddress: context.ipAddress ?? null,
      userAgent: context.userAgent ?? null,
      revoked: false,
    };

    await sessionStore.saveSession(session, Math.ceil(refreshTtlMs / 1000));

    return { token, refreshToken, session };
  }

  async verifyToken(token: string): Promise<User | null> {
    try {
      if (!token) return null;

      const decoded = jwt.verify(token, config.jwt.secret) as TokenPayload;
      if (!decoded.sessionId) {
        logger.warn('Access token missing session identifier');
        return null;
      }

      const session = await sessionStore.getSession(decoded.sessionId);
      if (!session || session.userId !== decoded.userId || session.revoked) {
        await this.markSessionRevoked(decoded.sessionId);
        return null;
      }

      if (this.isSessionExpired(session)) {
        await this.revokeSession(session.userId, session.sessionId);
        return null;
      }

      if (this.isSessionIdle(session)) {
        await this.revokeSession(session.userId, session.sessionId);
        return null;
      }

      await sessionStore.touchSession(session.sessionId);

      const client = await this.getPool().connect();
      try {
        const userResult = await client.query(
          'SELECT * FROM users WHERE id = $1 AND is_active = true',
          [decoded.userId],
        );

        if (userResult.rows.length === 0) {
          await this.revokeSession(session.userId, session.sessionId);
          return null;
        }

        await client.query('UPDATE user_sessions SET last_used = CURRENT_TIMESTAMP WHERE session_id = $1', [
          session.sessionId,
        ]);

        return this.formatUser(userResult.rows[0] as DatabaseUser);
      } finally {
        client.release();
      }
    } catch (error: any) {
      logger.warn('Invalid token:', error.message);
      return null;
    }
  }

  async revokeSession(userId: string, sessionId: string): Promise<boolean> {
    const client = await this.getPool().connect();
    try {
      const result = await client.query(
        `UPDATE user_sessions
         SET revoked = TRUE, revoked_at = CURRENT_TIMESTAMP
         WHERE user_id = $1 AND session_id = $2 AND revoked = FALSE`,
        [userId, sessionId],
      );

      await sessionStore.revokeSession(sessionId);
      return result.rowCount > 0;
    } catch (error) {
      logger.error('Error revoking session:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async revokeAllSessions(userId: string, exceptSessionId?: string): Promise<number> {
    const client = await this.getPool().connect();
    try {
      const query = exceptSessionId
        ? `UPDATE user_sessions
           SET revoked = TRUE, revoked_at = CURRENT_TIMESTAMP
           WHERE user_id = $1 AND session_id <> $2 AND revoked = FALSE`
        : `UPDATE user_sessions
           SET revoked = TRUE, revoked_at = CURRENT_TIMESTAMP
           WHERE user_id = $1 AND revoked = FALSE`;

      const params = exceptSessionId ? [userId, exceptSessionId] : [userId];
      const result = await client.query(query, params);
      const redisRevoked = await sessionStore.revokeAllSessionsForUser(userId, exceptSessionId);
      return Math.max(result.rowCount, redisRevoked);
    } catch (error) {
      logger.error('Error revoking all sessions:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async listActiveSessions(userId: string): Promise<ActiveSessionRecord[]> {
    const sessions = await sessionStore.listSessionsForUser(userId);
    const active: ActiveSessionRecord[] = [];

    for (const session of sessions) {
      if (this.isSessionExpired(session) || this.isSessionIdle(session)) {
        await this.revokeSession(userId, session.sessionId);
        continue;
      }
      active.push(session);
    }

    return active;
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

  private async markSessionRevoked(sessionId: string): Promise<void> {
    const client = await this.getPool().connect();
    try {
      await client.query(
        'UPDATE user_sessions SET revoked = TRUE, revoked_at = CURRENT_TIMESTAMP WHERE session_id = $1',
        [sessionId],
      );
    } catch (error) {
      logger.warn('Failed to mark session revoked', error);
    } finally {
      client.release();
    }
  }

  private parseDurationToMs(value: string): number {
    const trimmed = value.trim();
    const numeric = Number(trimmed);
    if (!Number.isNaN(numeric) && trimmed === numeric.toString()) {
      return numeric;
    }

    const match = /^([0-9]+)([smhd])$/i.exec(trimmed);
    if (!match) {
      return 7 * 24 * 60 * 60 * 1000; // default 7 days
    }

    const amount = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();
    switch (unit) {
      case 's':
        return amount * 1000;
      case 'm':
        return amount * 60 * 1000;
      case 'h':
        return amount * 60 * 60 * 1000;
      case 'd':
        return amount * 24 * 60 * 60 * 1000;
      default:
        return amount;
    }
  }

  private getRefreshTtlMs(): number {
    return this.parseDurationToMs(config.jwt.refreshExpiresIn);
  }

  private isSessionExpired(session: ActiveSessionRecord): boolean {
    return new Date(session.expiresAt).getTime() <= Date.now();
  }

  private isSessionIdle(session: ActiveSessionRecord): boolean {
    return Date.now() - new Date(session.lastActivityAt).getTime() > this.idleTimeoutMs;
  }
}

export default AuthService;
