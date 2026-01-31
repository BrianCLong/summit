// @ts-nocheck
import { getPostgresPool } from '../config/database.js';
import logger from '../utils/logger.js';
import { AuthSSOProvider, OIDCProvider, SAMLProviderStub, SSOConfig, SSOUserClaims } from './SSOProvider.js';
import { AuthService } from '../services/AuthService.js';
import { randomUUID } from 'node:crypto';
import { Pool, PoolClient } from 'pg';

interface User {
  id: string;
  email: string;
  username: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  role: string;
  is_active: boolean;
  created_at: Date;
  default_tenant_id: string;
}

export class SSOService {
  private pool: Pool;
  private authService: AuthService;

  constructor() {
    this.pool = getPostgresPool() as unknown as Pool;
    this.authService = new AuthService();
  }

  private getProvider(config: SSOConfig): AuthSSOProvider {
    switch (config.providerType) {
      case 'oidc':
        return new OIDCProvider(config);
      case 'saml':
        return new SAMLProviderStub();
      default:
        throw new Error(`Unsupported provider type: ${config.providerType}`);
    }
  }

  async configureSSO(config: SSOConfig): Promise<void> {
    const client = await this.pool.connect();
    try {
      // Validate config first
      const provider = this.getProvider(config);
      const isValid = await provider.validateConfig(config);
      if (!isValid) {
        throw new Error('Invalid SSO configuration');
      }

      await client.query(`
        INSERT INTO tenant_sso_config (
          tenant_id, provider_type, issuer_url, client_id, client_secret,
          authorization_url, token_url, user_info_url, mapping, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (tenant_id) DO UPDATE SET
          provider_type = EXCLUDED.provider_type,
          issuer_url = EXCLUDED.issuer_url,
          client_id = EXCLUDED.client_id,
          client_secret = EXCLUDED.client_secret,
          authorization_url = EXCLUDED.authorization_url,
          token_url = EXCLUDED.token_url,
          user_info_url = EXCLUDED.user_info_url,
          mapping = EXCLUDED.mapping,
          is_active = EXCLUDED.is_active,
          updated_at = CURRENT_TIMESTAMP
      `, [
        config.tenantId,
        config.providerType,
        config.issuerUrl,
        config.clientId,
        config.clientSecret,
        config.authorizationUrl,
        config.tokenUrl,
        config.userInfoUrl,
        JSON.stringify(config.mapping || {}),
        config.isActive
      ]);
    } finally {
      client.release();
    }
  }

  async getSSOConfig(tenantId: string): Promise<SSOConfig | null> {
    const result = await this.pool.query(
      'SELECT * FROM tenant_sso_config WHERE tenant_id = $1',
      [tenantId]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      tenantId: row.tenant_id,
      providerType: row.provider_type,
      issuerUrl: row.issuer_url,
      clientId: row.client_id,
      clientSecret: row.client_secret,
      authorizationUrl: row.authorization_url,
      tokenUrl: row.token_url,
      userInfoUrl: row.user_info_url,
      mapping: row.mapping,
      isActive: row.is_active
    };
  }

  async generateAuthUrl(tenantId: string, callbackUrl: string): Promise<string> {
    const config = await this.getSSOConfig(tenantId);
    if (!config || !config.isActive) {
      throw new Error('SSO not configured or inactive for this tenant');
    }

    const provider = this.getProvider(config);
    // Generate a state to prevent CSRF and store it (simplified here)
    const state = randomUUID();

    // We should store state -> tenantId mapping to verify callback
    await this.pool.query(
        `INSERT INTO sso_states (state, tenant_id, created_at) VALUES ($1, $2, NOW())`,
        [state, tenantId]
    );

    return provider.generateAuthUrl(tenantId, state, callbackUrl);
  }

  async handleCallback(
    code: string,
    state: string,
    callbackUrl: string,
  ): Promise<{
    user: User;
    token: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    // 1. Verify state and get tenantId
    const stateResult = await this.pool.query(
        `DELETE FROM sso_states WHERE state = $1 RETURNING tenant_id`,
        [state]
    );

    if (stateResult.rows.length === 0) {
        throw new Error('Invalid or expired state parameter');
    }
    const tenantId = stateResult.rows[0].tenant_id;

    const config = await this.getSSOConfig(tenantId);
    if (!config) throw new Error('SSO config missing');

    const provider = this.getProvider(config);
    const claims = await provider.verifyCallback(code, tenantId, callbackUrl);

    return this.provisionOrUpdateUser(claims, tenantId);
  }

  private async provisionOrUpdateUser(claims: SSOUserClaims, tenantId: string) {
    // Check if user exists by email
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const userRes = await client.query('SELECT * FROM users WHERE email = $1', [claims.email]);
      let user;

      if (userRes.rows.length > 0) {
        user = userRes.rows[0];
        // Ensure user is linked to tenant?
        // Logic to update user roles from claims can go here
      } else {
        // Provision new user
        const passwordHash = await import('argon2').then(a => a.hash(randomUUID())); // Random password
        const insertRes = await client.query(`
          INSERT INTO users (email, username, password_hash, first_name, last_name, role, is_active, created_at, default_tenant_id)
          VALUES ($1, $2, $3, $4, $5, $6, true, NOW(), $7)
          RETURNING *
        `, [
          claims.email,
          claims.email, // username defaults to email
          passwordHash,
          claims.firstName,
          claims.lastName,
          claims.role || 'ANALYST', // Default role mapping could be improved
          tenantId
        ]);
        user = insertRes.rows[0];
      }

      // Enforce Tenant Binding
      await client.query(`
        INSERT INTO user_tenants (user_id, tenant_id, roles)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id, tenant_id) DO UPDATE SET
          roles = EXCLUDED.roles
      `, [user.id, tenantId, [user.role]]); // Map SSO roles to tenant roles

      // Generate Tokens
      const tokenPair = await this.authService.generateTokens(user, client);

      await client.query('COMMIT');

      return {
          user: user, // Should format user properly like AuthService does
          token: tokenPair.token,
          refreshToken: tokenPair.refreshToken,
          expiresIn: 24 * 60 * 60
      };

    } catch (e: any) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async testConnection(config: SSOConfig): Promise<{ success: boolean; message?: string }> {
      try {
          const provider = this.getProvider(config);
          const valid = await provider.validateConfig(config);
          return { success: valid };
      } catch (e: any) {
          return { success: false, message: e.message };
      }
  }
}
