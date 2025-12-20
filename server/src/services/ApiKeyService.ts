import { pg } from '../db/pg.js';
import crypto from 'crypto';

export interface ApiKey {
  id: string;
  tenant_id: string;
  prefix: string;
  name: string;
  scopes: string[];
  last_used_at: Date | null;
  expires_at: Date | null;
  revoked_at: Date | null;
  created_at: Date;
  created_by: string | null;
}

export interface CreateApiKeyInput {
  tenantId: string;
  name: string;
  scopes: string[];
  expiresInDays?: number;
  createdBy?: string;
}

export class ApiKeyService {
  private static instance: ApiKeyService;

  private constructor() {}

  public static getInstance(): ApiKeyService {
    if (!ApiKeyService.instance) {
      ApiKeyService.instance = new ApiKeyService();
    }
    return ApiKeyService.instance;
  }

  /**
   * Generates a secure random API key
   * Format: sk_live_<24 random hex chars>
   */
  private generateKey(): string {
    return `sk_live_${crypto.randomBytes(24).toString('hex')}`;
  }

  /**
   * Hashes the API key for secure storage
   */
  private hashKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  /**
   * Create a new API key for a tenant
   */
  async createApiKey(input: CreateApiKeyInput): Promise<{ apiKey: ApiKey; token: string }> {
    const token = this.generateKey();
    const keyHash = this.hashKey(token);
    const prefix = token.substring(0, 8) + '...';

    let expiresAt: Date | null = null;
    if (input.expiresInDays) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + input.expiresInDays);
    }

    const result = await pg.one(
      `INSERT INTO api_keys (
        tenant_id, key_hash, prefix, name, scopes, expires_at, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7
      ) RETURNING *`,
      [
        input.tenantId,
        keyHash,
        prefix,
        input.name,
        input.scopes,
        expiresAt,
        input.createdBy,
      ],
      { tenantId: input.tenantId }
    );

    return {
      apiKey: result,
      token, // Return the raw token only once!
    };
  }

  /**
   * Validate an API key
   */
  async validateApiKey(token: string): Promise<ApiKey | null> {
    if (!token || !token.startsWith('sk_live_')) {
      return null;
    }

    const keyHash = this.hashKey(token);

    const apiKey = await pg.oneOrNone(
      `SELECT * FROM api_keys WHERE key_hash = $1`,
      [keyHash]
    );

    if (!apiKey) {
      return null;
    }

    // Check revocation
    if (apiKey.revoked_at) {
      return null;
    }

    // Check expiration
    if (apiKey.expires_at && new Date(apiKey.expires_at) < new Date()) {
      return null;
    }

    // Update usage asynchronously
    // We don't await this to avoid blocking the request
    this.updateUsage(apiKey.id, apiKey.tenant_id).catch(err => {
        console.error('Failed to update API key usage', err);
    });

    return apiKey;
  }

  /**
   * Update last used timestamp
   */
  private async updateUsage(id: string, tenantId: string): Promise<void> {
    await pg.none(
      `UPDATE api_keys SET last_used_at = NOW() WHERE id = $1`,
      [id],
      { tenantId } // For RLS if applicable, though checking key_hash is usually global
    );
  }

  /**
   * Revoke an API key
   */
  async revokeApiKey(id: string, tenantId: string): Promise<boolean> {
    const result = await pg.result(
      `UPDATE api_keys SET revoked_at = NOW() WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId],
      { tenantId }
    );
    return result.rowCount > 0;
  }

  /**
   * List API keys for a tenant
   */
  async listApiKeys(tenantId: string): Promise<ApiKey[]> {
    return pg.manyOrNone(
      `SELECT id, tenant_id, prefix, name, scopes, last_used_at, expires_at, revoked_at, created_at, created_by
       FROM api_keys
       WHERE tenant_id = $1
       ORDER BY created_at DESC`,
      [tenantId],
      { tenantId }
    );
  }
}

export const apiKeyService = ApiKeyService.getInstance();
