"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SSOService = void 0;
const TenantService_js_1 = require("./TenantService.js");
const AuthService_js_1 = require("./AuthService.js");
const SAMLProvider_js_1 = require("./sso/SAMLProvider.js");
const OIDCProvider_js_1 = require("./sso/OIDCProvider.js");
const database_js_1 = require("../config/database.js");
const crypto_1 = __importDefault(require("crypto"));
class SSOService {
    tenantService;
    authService;
    constructor() {
        this.tenantService = TenantService_js_1.TenantService.getInstance();
        this.authService = new AuthService_js_1.AuthService();
    }
    async getAuthUrl(tenantId, callbackBaseUrl) {
        const tenant = await this.tenantService.getTenant(tenantId);
        if (!tenant)
            throw new Error('Tenant not found');
        const ssoConfig = tenant.config.sso;
        if (!ssoConfig)
            throw new Error('SSO not configured for this tenant');
        const provider = this.getProvider(ssoConfig);
        const callbackUrl = `${callbackBaseUrl}/auth/sso/${tenantId}/callback`;
        // Create state to prevent CSRF and replay
        const state = crypto_1.default.randomBytes(32).toString('hex');
        const url = await provider.generateAuthUrl(callbackUrl, state);
        return { url, state };
    }
    async handleCallback(tenantId, callbackBaseUrl, body, query) {
        const tenant = await this.tenantService.getTenant(tenantId);
        if (!tenant)
            throw new Error('Tenant not found');
        const ssoConfig = tenant.config.sso;
        if (!ssoConfig)
            throw new Error('SSO not configured for this tenant');
        const provider = this.getProvider(ssoConfig);
        const callbackUrl = `${callbackBaseUrl}/auth/sso/${tenantId}/callback`;
        // Validate callback
        const ssoUser = await provider.handleCallback(callbackUrl, body, query);
        // Provision or Update User
        return this.provisionUser(ssoUser, tenantId);
    }
    getProvider(config) {
        if (config.type === 'saml') {
            return new SAMLProvider_js_1.SAMLProvider(config);
        }
        else if (config.type === 'oidc') {
            return new OIDCProvider_js_1.OIDCProvider(config);
        }
        throw new Error(`Unsupported SSO type: ${config.type}`);
    }
    async provisionUser(ssoUser, tenantId) {
        const pool = (0, database_js_1.getPostgresPool)();
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            // Check if user exists
            const existing = await client.query('SELECT * FROM users WHERE email = $1', [ssoUser.email]);
            let user;
            if (existing.rows.length > 0) {
                // Update user
                const updateQuery = `
          UPDATE users SET
            first_name = COALESCE($1, first_name),
            last_name = COALESCE($2, last_name),
            last_login = NOW(),
            tenant_id = $3
          WHERE email = $4
          RETURNING *
        `;
                const res = await client.query(updateQuery, [ssoUser.firstName, ssoUser.lastName, tenantId, ssoUser.email]);
                user = res.rows[0];
            }
            else {
                // Create user
                const insertQuery = `
          INSERT INTO users (
            id, email, password_hash, first_name, last_name, role, is_active, tenant_id, created_at, updated_at
          ) VALUES (
            $1, $2, 'sso_placeholder', $3, $4, $5, true, $6, NOW(), NOW()
          ) RETURNING *
        `;
                // Default role is VIEWER if not mapped
                const role = (ssoUser.roles || []).includes('ADMIN') ? 'ADMIN' : ((ssoUser.roles || []).includes('ANALYST') ? 'ANALYST' : 'VIEWER');
                const res = await client.query(insertQuery, [
                    crypto_1.default.randomUUID(),
                    ssoUser.email,
                    ssoUser.firstName,
                    ssoUser.lastName,
                    role,
                    tenantId
                ]);
                user = res.rows[0];
            }
            // Ensure tenant association
            await client.query(`INSERT INTO user_tenants (user_id, tenant_id, roles)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, tenant_id) DO UPDATE SET roles = $3`, [user.id, tenantId, ssoUser.roles]);
            await client.query('COMMIT');
            // Generate tokens
            const { token, refreshToken } = await this.authService.generateTokens(user, client);
            return {
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.first_name,
                    lastName: user.last_name,
                    role: user.role,
                    tenantId: user.tenant_id
                },
                token,
                refreshToken
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
}
exports.SSOService = SSOService;
