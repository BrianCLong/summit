"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SSOService = void 0;
// @ts-nocheck
const database_js_1 = require("../config/database.js");
const SSOProvider_js_1 = require("./SSOProvider.js");
const AuthService_js_1 = require("../services/AuthService.js");
const node_crypto_1 = require("node:crypto");
class SSOService {
    pool;
    authService;
    constructor() {
        this.pool = (0, database_js_1.getPostgresPool)();
        this.authService = new AuthService_js_1.AuthService();
    }
    getProvider(config) {
        switch (config.providerType) {
            case 'oidc':
                return new SSOProvider_js_1.OIDCProvider(config);
            case 'saml':
                return new SSOProvider_js_1.SAMLProviderStub();
            default:
                throw new Error(`Unsupported provider type: ${config.providerType}`);
        }
    }
    async configureSSO(config) {
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
        }
        finally {
            client.release();
        }
    }
    async getSSOConfig(tenantId) {
        const result = await this.pool.query('SELECT * FROM tenant_sso_config WHERE tenant_id = $1', [tenantId]);
        if (result.rows.length === 0)
            return null;
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
    async generateAuthUrl(tenantId, callbackUrl) {
        const config = await this.getSSOConfig(tenantId);
        if (!config || !config.isActive) {
            throw new Error('SSO not configured or inactive for this tenant');
        }
        const provider = this.getProvider(config);
        // Generate a state to prevent CSRF and store it (simplified here)
        const state = (0, node_crypto_1.randomUUID)();
        // We should store state -> tenantId mapping to verify callback
        await this.pool.query(`INSERT INTO sso_states (state, tenant_id, created_at) VALUES ($1, $2, NOW())`, [state, tenantId]);
        return provider.generateAuthUrl(tenantId, state, callbackUrl);
    }
    async handleCallback(code, state, callbackUrl) {
        // 1. Verify state and get tenantId
        const stateResult = await this.pool.query(`DELETE FROM sso_states WHERE state = $1 RETURNING tenant_id`, [state]);
        if (stateResult.rows.length === 0) {
            throw new Error('Invalid or expired state parameter');
        }
        const tenantId = stateResult.rows[0].tenant_id;
        const config = await this.getSSOConfig(tenantId);
        if (!config)
            throw new Error('SSO config missing');
        const provider = this.getProvider(config);
        const claims = await provider.verifyCallback(code, tenantId, callbackUrl);
        return this.provisionOrUpdateUser(claims, tenantId);
    }
    async provisionOrUpdateUser(claims, tenantId) {
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
            }
            else {
                // Provision new user
                const passwordHash = await Promise.resolve().then(() => __importStar(require('argon2'))).then(a => a.hash((0, node_crypto_1.randomUUID)())); // Random password
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
        }
        catch (e) {
            await client.query('ROLLBACK');
            throw e;
        }
        finally {
            client.release();
        }
    }
    async testConnection(config) {
        try {
            const provider = this.getProvider(config);
            const valid = await provider.validateConfig(config);
            return { success: valid };
        }
        catch (e) {
            return { success: false, message: e.message };
        }
    }
}
exports.SSOService = SSOService;
