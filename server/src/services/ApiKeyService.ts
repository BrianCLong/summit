// @ts-nocheck
import { pg } from '../db/pg.js';
import crypto from 'crypto';

/**
 * @interface ApiKey
 * @description Represents the structure of an API key as stored in the database (excluding the key hash).
 * @property {string} id - The unique identifier for the API key.
 * @property {string} tenant_id - The ID of the tenant this key belongs to.
 * @property {string} prefix - A non-sensitive prefix of the key for easy identification (e.g., 'sk_live_...').
 * @property {string} name - A human-readable name for the key.
 * @property {string[]} scopes - A list of permissions or scopes granted to the key.
 * @property {Date | null} last_used_at - Timestamp of when the key was last used.
 * @property {Date | null} expires_at - Timestamp when the key is set to expire.
 * @property {Date | null} revoked_at - Timestamp when the key was revoked.
 * @property {Date} created_at - Timestamp of when the key was created.
 * @property {string | null} created_by - The ID of the user who created the key.
 */
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

/**
 * @interface CreateApiKeyInput
 * @description Defines the required and optional fields for creating a new API key.
 * @property {string} tenantId - The ID of the tenant for whom the key is being created.
 * @property {string} name - A descriptive name for the key.
 * @property {string[]} scopes - The permissions to be granted to the key.
 * @property {number} [expiresInDays] - Optional number of days after which the key should expire.
 * @property {string} [createdBy] - Optional ID of the user creating the key.
 */
export interface CreateApiKeyInput {
  tenantId: string;
  name: string;
  scopes: string[];
  expiresInDays?: number;
  createdBy?: string;
}

/**
 * @class ApiKeyService
 * @description Manages the lifecycle of API keys, including creation, validation, revocation, and listing.
 * Implemented as a singleton.
 *
 * @example
 * ```typescript
 * const apiKeyService = ApiKeyService.getInstance();
 * const { apiKey, token } = await apiKeyService.createApiKey({
 *   tenantId: 'my-tenant',
 *   name: 'My New Key',
 *   scopes: ['read:data'],
 * });
 * // IMPORTANT: `token` is only returned on creation. Store it securely.
 * ```
 */
export class ApiKeyService {
  private static instance: ApiKeyService;

  private constructor() {}

  /**
   * @method getInstance
   * @description Gets the singleton instance of the ApiKeyService.
   * @static
   * @returns {ApiKeyService} The singleton instance.
   */
  public static getInstance(): ApiKeyService {
    if (!ApiKeyService.instance) {
      ApiKeyService.instance = new ApiKeyService();
    }
    return ApiKeyService.instance;
  }

  /**
   * @private
   * @method generateKey
   * @description Generates a cryptographically secure random API key with a standard prefix.
   * @returns {string} A new API key in the format `sk_live_<48 hex characters>`.
   */
  private generateKey(): string {
    return `sk_live_${crypto.randomBytes(24).toString('hex')}`;
  }

  /**
   * @private
   * @method hashKey
   * @description Hashes an API key using SHA256 for secure storage in the database.
   * @param {string} key - The raw API key to hash.
   * @returns {string} The SHA256 hash of the key.
   */
  private hashKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  /**
   * @method createApiKey
   * @description Creates a new API key for a tenant, hashes it for storage, and returns the raw key and its metadata.
   * **Important**: The raw token is only returned this one time and should be stored securely by the caller.
   * @param {CreateApiKeyInput} input - The details for the new API key.
   * @returns {Promise<{ apiKey: ApiKey; token: string }>} An object containing the stored API key metadata and the raw, unhashed token.
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
   * @method validateApiKey
   * @description Validates a raw API key. It hashes the key and checks for a matching, valid (not revoked, not expired) key in the database.
   * On successful validation, it asynchronously updates the key's `last_used_at` timestamp.
   * @param {string} token - The raw API key token to validate.
   * @returns {Promise<ApiKey | null>} The API key metadata if the key is valid, otherwise null.
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
   * @private
   * @method updateUsage
   * @description Updates the `last_used_at` timestamp for a given API key.
   * @param {string} id - The ID of the API key to update.
   * @param {string} tenantId - The tenant ID, used for RLS policy context.
   * @returns {Promise<void>}
   */
  private async updateUsage(id: string, tenantId: string): Promise<void> {
    await pg.none(
      `UPDATE api_keys SET last_used_at = NOW() WHERE id = $1`,
      [id],
      { tenantId } // For RLS if applicable, though checking key_hash is usually global
    );
  }

  /**
   * @method revokeApiKey
   * @description Revokes an API key, preventing it from being used for future authentications.
   * @param {string} id - The ID of the API key to revoke.
   * @param {string} tenantId - The ID of the tenant that owns the key, for authorization.
   * @returns {Promise<boolean>} `true` if the key was successfully revoked, `false` otherwise.
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
   * @method listApiKeys
   * @description Retrieves a list of all API keys for a given tenant, excluding the sensitive key hash.
   * @param {string} tenantId - The ID of the tenant whose keys are to be listed.
   * @returns {Promise<ApiKey[]>} A list of API key metadata objects.
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
