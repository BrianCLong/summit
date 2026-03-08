"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiKeyService = exports.ApiKeyService = void 0;
// @ts-nocheck
const pg_js_1 = require("../db/pg.js");
const crypto_1 = __importDefault(require("crypto"));
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
class ApiKeyService {
    static instance;
    constructor() { }
    /**
     * @method getInstance
     * @description Gets the singleton instance of the ApiKeyService.
     * @static
     * @returns {ApiKeyService} The singleton instance.
     */
    static getInstance() {
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
    generateKey() {
        return `sk_live_${crypto_1.default.randomBytes(24).toString('hex')}`;
    }
    /**
     * @private
     * @method hashKey
     * @description Hashes an API key using SHA256 for secure storage in the database.
     * @param {string} key - The raw API key to hash.
     * @returns {string} The SHA256 hash of the key.
     */
    hashKey(key) {
        return crypto_1.default.createHash('sha256').update(key).digest('hex');
    }
    /**
     * @method createApiKey
     * @description Creates a new API key for a tenant, hashes it for storage, and returns the raw key and its metadata.
     * **Important**: The raw token is only returned this one time and should be stored securely by the caller.
     * @param {CreateApiKeyInput} input - The details for the new API key.
     * @returns {Promise<{ apiKey: ApiKey; token: string }>} An object containing the stored API key metadata and the raw, unhashed token.
     */
    async createApiKey(input) {
        const token = this.generateKey();
        const keyHash = this.hashKey(token);
        const prefix = token.substring(0, 8) + '...';
        let expiresAt = null;
        if (input.expiresInDays) {
            expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + input.expiresInDays);
        }
        const result = await pg_js_1.pg.one(`INSERT INTO api_keys (
        tenant_id, key_hash, prefix, name, scopes, expires_at, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7
      ) RETURNING *`, [
            input.tenantId,
            keyHash,
            prefix,
            input.name,
            input.scopes,
            expiresAt,
            input.createdBy,
        ], { tenantId: input.tenantId });
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
    async validateApiKey(token) {
        if (!token || !token.startsWith('sk_live_')) {
            return null;
        }
        const keyHash = this.hashKey(token);
        const apiKey = await pg_js_1.pg.oneOrNone(`SELECT * FROM api_keys WHERE key_hash = $1`, [keyHash]);
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
    async updateUsage(id, tenantId) {
        await pg_js_1.pg.none(`UPDATE api_keys SET last_used_at = NOW() WHERE id = $1`, [id], { tenantId } // For RLS if applicable, though checking key_hash is usually global
        );
    }
    /**
     * @method revokeApiKey
     * @description Revokes an API key, preventing it from being used for future authentications.
     * @param {string} id - The ID of the API key to revoke.
     * @param {string} tenantId - The ID of the tenant that owns the key, for authorization.
     * @returns {Promise<boolean>} `true` if the key was successfully revoked, `false` otherwise.
     */
    async revokeApiKey(id, tenantId) {
        const result = await pg_js_1.pg.result(`UPDATE api_keys SET revoked_at = NOW() WHERE id = $1 AND tenant_id = $2`, [id, tenantId], { tenantId });
        return result.rowCount > 0;
    }
    /**
     * @method listApiKeys
     * @description Retrieves a list of all API keys for a given tenant, excluding the sensitive key hash.
     * @param {string} tenantId - The ID of the tenant whose keys are to be listed.
     * @returns {Promise<ApiKey[]>} A list of API key metadata objects.
     */
    async listApiKeys(tenantId) {
        return pg_js_1.pg.manyOrNone(`SELECT id, tenant_id, prefix, name, scopes, last_used_at, expires_at, revoked_at, created_at, created_by
       FROM api_keys
       WHERE tenant_id = $1
       ORDER BY created_at DESC`, [tenantId], { tenantId });
    }
}
exports.ApiKeyService = ApiKeyService;
exports.apiKeyService = ApiKeyService.getInstance();
