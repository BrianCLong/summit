import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { randomUUID as uuidv4 } from 'crypto';
import speakeasy from 'speakeasy';
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
  mfaEnabled?: boolean;
  mfaVerified?: boolean;
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
  mfa_secret?: string;
  mfa_enabled?: boolean;
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
  mfaVerified: boolean;
}

interface TokenPair {
  token: string;
  refreshToken: string;
}

interface MfaSetupPayload {
  secret: string;
  otpauthUrl: string;
}

interface AuthResult {
  user: User;
  token?: string;
  refreshToken?: string;
  expiresIn?: number;
  requiresMfa: boolean;
  challengeId?: string;
  mfaSetup?: MfaSetupPayload;
}

interface MfaRequirement {
  requiresMfa: boolean;
  challengeId?: string;
  mfaSetup?: MfaSetupPayload;
}

interface DatabaseChallenge extends DatabaseUser {
  purpose: 'AUTH' | 'SETUP';
  expires_at: Date;
  consumed_at?: Date | null;
}

export interface MfaPolicy {
  role: string;
  requireMfa: boolean;
  updatedAt: Date;
}

// Define permissions for each role
const ROLE_PERMISSIONS: Record<string, string[]> = {
  ADMIN: [
    '*', // Admin has all permissions
    'security:mfa:manage',
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

  async register(userData: UserData): Promise<AuthResult> {
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
      const { token, refreshToken } = await this.generateTokens(user, client, { mfaVerified: true });

      await client.query('COMMIT');

      const formattedUser = this.formatUser(user);
      formattedUser.mfaVerified = true;

      return {
        user: formattedUser,
        token,
        refreshToken,
        expiresIn: 24 * 60 * 60,
        requiresMfa: false,
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
  ): Promise<AuthResult> {
    const client = await this.getPool().connect();

    try {
      await client.query('BEGIN');

      const userResult = await client.query<DatabaseUser>(
        `
          SELECT u.*, umf.secret AS mfa_secret, umf.enabled AS mfa_enabled
          FROM users u
          LEFT JOIN user_mfa_factors umf ON umf.user_id = u.id
          WHERE u.email = $1 AND u.is_active = true
        `,
        [email],
      );

      if (userResult.rows.length === 0) {
        throw new Error('Invalid credentials');
      }

      const user = userResult.rows[0];
      const validPassword = await argon2.verify(user.password_hash, password);

      if (!validPassword) {
        throw new Error('Invalid credentials');
      }

      await client.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [
        user.id,
      ]);

      const mfaRequirement = await this.evaluateMfaRequirement(user, client);

      if (mfaRequirement.requiresMfa) {
        await client.query('COMMIT');
        const formattedUser = this.formatUser(user);
        formattedUser.mfaVerified = false;
        return {
          user: formattedUser,
          requiresMfa: true,
          challengeId: mfaRequirement.challengeId,
          mfaSetup: mfaRequirement.mfaSetup,
        };
      }

      const { token, refreshToken } = await this.generateTokens(user, client, { mfaVerified: true });

      await client.query('COMMIT');

      const formattedUser = this.formatUser(user);
      formattedUser.mfaVerified = true;

      return {
        user: formattedUser,
        token,
        refreshToken,
        expiresIn: 24 * 60 * 60,
        requiresMfa: false,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error logging in user:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Issue JWT and refresh token for an already authenticated (OIDC/SSO) user.
   */
  async loginOIDC(email: string): Promise<AuthResult> {
    const client = await this.getPool().connect();
    try {
      await client.query('BEGIN');

      const userResult = await client.query<DatabaseUser>(
        `
          SELECT u.*, umf.secret AS mfa_secret, umf.enabled AS mfa_enabled
          FROM users u
          LEFT JOIN user_mfa_factors umf ON umf.user_id = u.id
          WHERE u.email = $1 AND u.is_active = true
        `,
        [email],
      );
      if (userResult.rows.length === 0) {
        throw new Error('User not found or inactive');
      }
      const user = userResult.rows[0];
      await client.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [
        user.id,
      ]);

      const mfaRequirement = await this.evaluateMfaRequirement(user, client);
      if (mfaRequirement.requiresMfa) {
        await client.query('COMMIT');
        const formattedUser = this.formatUser(user);
        formattedUser.mfaVerified = false;
        return {
          user: formattedUser,
          requiresMfa: true,
          challengeId: mfaRequirement.challengeId,
          mfaSetup: mfaRequirement.mfaSetup,
        };
      }

      const { token, refreshToken } = await this.generateTokens(user, client, { mfaVerified: true });
      await client.query('COMMIT');
      const formattedUser = this.formatUser(user);
      formattedUser.mfaVerified = true;
      return {
        user: formattedUser,
        token,
        refreshToken,
        expiresIn: 24 * 60 * 60,
        requiresMfa: false,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async generateTokens(
    user: DatabaseUser,
    client: PoolClient,
    options: { mfaVerified?: boolean } = {},
  ): Promise<TokenPair> {
    const tokenPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      mfaVerified: options.mfaVerified ?? true,
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

  private async roleRequiresMfa(role: string, client: PoolClient): Promise<boolean> {
    if (!role) {
      return false;
    }
    const normalizedRole = role.toUpperCase();
    const result = await client.query<{ require_mfa: boolean }>(
      'SELECT require_mfa FROM mfa_role_policies WHERE role = $1',
      [normalizedRole],
    );
    return result.rows[0]?.require_mfa ?? false;
  }

  private buildOtpauthUrl(email: string, secret: string): string {
    return speakeasy.otpauthURL({
      secret,
      encoding: 'base32',
      label: `Summit:${email}`,
      issuer: 'Summit',
    });
  }

  private async createMfaChallenge(
    userId: string,
    client: PoolClient,
    purpose: 'AUTH' | 'SETUP',
  ): Promise<string> {
    const challengeId = uuidv4();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await client.query(
      `
        INSERT INTO user_mfa_challenges (id, user_id, purpose, expires_at)
        VALUES ($1, $2, $3, $4)
      `,
      [challengeId, userId, purpose, expiresAt],
    );
    return challengeId;
  }

  private async ensureMfaSecret(
    user: DatabaseUser,
    client: PoolClient,
  ): Promise<{ secret: string; otpauthUrl: string }> {
    const generated = speakeasy.generateSecret({
      length: 32,
      issuer: 'Summit',
      name: `Summit (${user.email})`,
    });
    await client.query(
      `
        INSERT INTO user_mfa_factors (user_id, secret, enabled, created_at, updated_at)
        VALUES ($1, $2, false, now(), now())
        ON CONFLICT (user_id)
        DO UPDATE SET secret = EXCLUDED.secret, enabled = false, updated_at = now()
      `,
      [user.id, generated.base32],
    );
    user.mfa_secret = generated.base32;
    user.mfa_enabled = false;
    return {
      secret: generated.base32,
      otpauthUrl: generated.otpauth_url || this.buildOtpauthUrl(user.email, generated.base32),
    };
  }

  private async evaluateMfaRequirement(user: DatabaseUser, client: PoolClient): Promise<MfaRequirement> {
    const roleRequires = await this.roleRequiresMfa(user.role, client);
    const hasEnabledMfa = Boolean(user.mfa_enabled);

    if (roleRequires && !user.mfa_secret) {
      const setup = await this.ensureMfaSecret(user, client);
      const challengeId = await this.createMfaChallenge(user.id, client, 'SETUP');
      return { requiresMfa: true, challengeId, mfaSetup: setup };
    }

    if (roleRequires && !hasEnabledMfa) {
      let secret = user.mfa_secret;
      if (!secret) {
        const setup = await this.ensureMfaSecret(user, client);
        secret = setup.secret;
      }
      const challengeId = await this.createMfaChallenge(user.id, client, 'SETUP');
      return {
        requiresMfa: true,
        challengeId,
        mfaSetup: {
          secret,
          otpauthUrl: this.buildOtpauthUrl(user.email, secret),
        },
      };
    }

    if (hasEnabledMfa || roleRequires) {
      const challengeId = await this.createMfaChallenge(user.id, client, 'AUTH');
      return { requiresMfa: true, challengeId };
    }

    return { requiresMfa: false };
  }

  async verifyMfaChallenge(challengeId: string, code: string): Promise<AuthResult> {
    const client = await this.getPool().connect();

    try {
      await client.query('BEGIN');

      const challengeResult = await client.query<DatabaseChallenge>(
        `
          SELECT c.purpose, c.expires_at, c.consumed_at, u.*, umf.secret AS mfa_secret, umf.enabled AS mfa_enabled
          FROM user_mfa_challenges c
          JOIN users u ON u.id = c.user_id
          LEFT JOIN user_mfa_factors umf ON umf.user_id = u.id
          WHERE c.id = $1
          FOR UPDATE
        `,
        [challengeId],
      );

      if (challengeResult.rows.length === 0) {
        throw new Error('Invalid or expired MFA challenge');
      }

      const challenge = challengeResult.rows[0];

      if (challenge.consumed_at) {
        throw new Error('MFA challenge already used');
      }

      if (new Date(challenge.expires_at).getTime() < Date.now()) {
        throw new Error('MFA challenge expired');
      }

      if (!challenge.mfa_secret) {
        throw new Error('MFA secret not configured for user');
      }

      const verified = speakeasy.totp.verify({
        secret: challenge.mfa_secret,
        encoding: 'base32',
        token: code,
        window: 1,
      });

      if (!verified) {
        throw new Error('Invalid MFA code');
      }

      if (challenge.purpose === 'SETUP') {
        await client.query(
          `
            INSERT INTO user_mfa_factors (user_id, secret, enabled, enrolled_at, last_used_at, updated_at)
            VALUES ($1, $2, true, now(), now(), now())
            ON CONFLICT (user_id)
            DO UPDATE SET
              enabled = true,
              enrolled_at = COALESCE(user_mfa_factors.enrolled_at, now()),
              last_used_at = now(),
              updated_at = now()
          `,
          [challenge.id, challenge.mfa_secret],
        );
        challenge.mfa_enabled = true;
      } else {
        await client.query(
          'UPDATE user_mfa_factors SET last_used_at = now(), updated_at = now() WHERE user_id = $1',
          [challenge.id],
        );
      }

      await client.query('UPDATE user_mfa_challenges SET consumed_at = now() WHERE id = $1', [challengeId]);
      await client.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [challenge.id]);

      const { token, refreshToken } = await this.generateTokens(challenge, client, { mfaVerified: true });

      await client.query('COMMIT');

      const formattedUser = this.formatUser({ ...challenge, mfa_enabled: true });
      formattedUser.mfaVerified = true;
      return {
        user: formattedUser,
        token,
        refreshToken,
        expiresIn: 24 * 60 * 60,
        requiresMfa: false,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to verify MFA challenge', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async verifyToken(token: string): Promise<User | null> {
    try {
      if (!token) return null;

      const decoded = jwt.verify(token, config.jwt.secret) as TokenPayload;

      const client = await this.getPool().connect();
      try {
        const userResult = await client.query<DatabaseUser>(
          `
            SELECT u.*, umf.enabled AS mfa_enabled
            FROM users u
            LEFT JOIN user_mfa_factors umf ON umf.user_id = u.id
            WHERE u.id = $1 AND u.is_active = true
          `,
          [decoded.userId],
        );

        if (userResult.rows.length === 0) {
          return null;
        }

        const user = userResult.rows[0];
        const requiresMfa =
          (await this.roleRequiresMfa(user.role, client)) || Boolean(user.mfa_enabled);

        if (requiresMfa && !decoded.mfaVerified) {
          logger.warn('Rejecting token without MFA verification', { userId: user.id });
          return null;
        }

        const formattedUser = this.formatUser(user);
        formattedUser.mfaVerified = decoded.mfaVerified;
        return formattedUser;
      } finally {
        client.release();
      }
    } catch (error: any) {
      logger.warn('Invalid token:', error.message);
      return null;
    }
  }

  async updateRoleMfaPolicy(role: string, requireMfa: boolean): Promise<MfaPolicy> {
    const client = await this.getPool().connect();
    try {
      const normalizedRole = role.toUpperCase();
      const result = await client.query<{ role: string; require_mfa: boolean; updated_at: Date }>(
        `
          INSERT INTO mfa_role_policies (role, require_mfa, updated_at)
          VALUES ($1, $2, now())
          ON CONFLICT (role)
          DO UPDATE SET require_mfa = EXCLUDED.require_mfa, updated_at = now()
          RETURNING role, require_mfa, updated_at
        `,
        [normalizedRole, requireMfa],
      );

      const policy = result.rows[0];
      return { role: policy.role, requireMfa: policy.require_mfa, updatedAt: policy.updated_at };
    } finally {
      client.release();
    }
  }

  async getRoleMfaPolicy(role: string): Promise<MfaPolicy | null> {
    const client = await this.getPool().connect();
    try {
      const normalizedRole = role.toUpperCase();
      const result = await client.query<{ role: string; require_mfa: boolean; updated_at: Date }>(
        'SELECT role, require_mfa, updated_at FROM mfa_role_policies WHERE role = $1',
        [normalizedRole],
      );
      if (result.rows.length === 0) {
        return null;
      }
      const policy = result.rows[0];
      return { role: policy.role, requireMfa: policy.require_mfa, updatedAt: policy.updated_at };
    } finally {
      client.release();
    }
  }

  async listRoleMfaPolicies(): Promise<MfaPolicy[]> {
    const client = await this.getPool().connect();
    try {
      const result = await client.query<{ role: string; require_mfa: boolean; updated_at: Date }>(
        'SELECT role, require_mfa, updated_at FROM mfa_role_policies ORDER BY role ASC',
      );
      return result.rows.map((row) => ({
        role: row.role,
        requireMfa: row.require_mfa,
        updatedAt: row.updated_at,
      }));
    } finally {
      client.release();
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
      fullName: `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim(),
      role: user.role,
      isActive: user.is_active,
      lastLogin: user.last_login,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      mfaEnabled: Boolean(user.mfa_enabled),
    };
  }
}

export default AuthService;
