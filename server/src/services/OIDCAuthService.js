"use strict";
/**
 * OIDC/SSO Authentication Service
 *
 * Provides enterprise SSO integration with Auth0, Azure AD, Google, and other OIDC providers.
 * Includes MFA support, SCIM user provisioning, and group-based RBAC mapping.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const axios_1 = __importDefault(require("axios"));
const crypto_1 = __importDefault(require("crypto"));
const database_js_1 = require("../config/database.js");
const logger_js_1 = __importDefault(require("../config/logger.js"));
const logger = logger_js_1.default.child({ name: 'oidcAuth' });
class OIDCAuthService {
    providers = new Map();
    jwksCache = new Map();
    constructor() {
        this.initializeProviders();
    }
    initializeProviders() {
        // Auth0 Configuration
        if (process.env.AUTH0_DOMAIN && process.env.AUTH0_CLIENT_ID) {
            this.providers.set('auth0', {
                name: 'Auth0',
                issuer: `https://${process.env.AUTH0_DOMAIN}/`,
                clientId: process.env.AUTH0_CLIENT_ID,
                clientSecret: process.env.AUTH0_CLIENT_SECRET || '',
                redirectUri: `${process.env.BASE_URL}/auth/callback/auth0`,
                scopes: ['openid', 'profile', 'email', 'groups'],
                jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`,
                userInfoEndpoint: `https://${process.env.AUTH0_DOMAIN}/userinfo`,
                tokenEndpoint: `https://${process.env.AUTH0_DOMAIN}/oauth/token`,
                authorizationEndpoint: `https://${process.env.AUTH0_DOMAIN}/authorize`,
                groupsClaim: 'https://intelgraph.ai/groups',
                enableMFA: true,
            });
        }
        // Azure AD Configuration
        if (process.env.AZURE_TENANT_ID && process.env.AZURE_CLIENT_ID) {
            this.providers.set('azure', {
                name: 'Azure AD',
                issuer: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/v2.0`,
                clientId: process.env.AZURE_CLIENT_ID,
                clientSecret: process.env.AZURE_CLIENT_SECRET || '',
                redirectUri: `${process.env.BASE_URL}/auth/callback/azure`,
                scopes: [
                    'openid',
                    'profile',
                    'email',
                    'User.Read',
                    'Directory.Read.All',
                ],
                jwksUri: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/discovery/v2.0/keys`,
                userInfoEndpoint: 'https://graph.microsoft.com/v1.0/me',
                tokenEndpoint: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/token`,
                authorizationEndpoint: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/authorize`,
                groupsClaim: 'groups',
                enableMFA: true,
                tenantId: process.env.AZURE_TENANT_ID,
            });
        }
        // Google Workspace Configuration
        if (process.env.GOOGLE_CLIENT_ID) {
            this.providers.set('google', {
                name: 'Google',
                issuer: 'https://accounts.google.com',
                clientId: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
                redirectUri: `${process.env.BASE_URL}/auth/callback/google`,
                scopes: ['openid', 'profile', 'email'],
                jwksUri: 'https://www.googleapis.com/oauth2/v3/certs',
                userInfoEndpoint: 'https://www.googleapis.com/oauth2/v2/userinfo',
                tokenEndpoint: 'https://oauth2.googleapis.com/token',
                authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
                enableMFA: false,
            });
        }
        logger.info(`Initialized ${this.providers.size} OIDC providers: ${Array.from(this.providers.keys()).join(', ')}`);
    }
    /**
     * Generate authorization URL for SSO login
     */
    generateAuthUrl(provider, state) {
        const config = this.providers.get(provider);
        if (!config) {
            throw new Error(`Unknown provider: ${provider}`);
        }
        const stateValue = state || crypto_1.default.randomBytes(16).toString('hex');
        const nonce = crypto_1.default.randomBytes(16).toString('hex');
        // PKCE code verifier/challenge
        const codeVerifier = this.base64url(crypto_1.default.randomBytes(32).toString('base64'));
        const codeChallenge = this.base64url(crypto_1.default.createHash('sha256').update(codeVerifier).digest('base64'));
        // Embed code_verifier in state for stateless retrieval (signed)
        const statePayload = this.signState({
            s: stateValue,
            n: nonce,
            v: codeVerifier,
        });
        const params = new URLSearchParams({
            response_type: 'code',
            client_id: config.clientId,
            redirect_uri: config.redirectUri,
            scope: config.scopes.join(' '),
            state: statePayload,
            nonce: nonce,
            code_challenge: codeChallenge,
            code_challenge_method: 'S256',
        });
        // Provider-specific parameters
        if (provider === 'azure') {
            params.append('response_mode', 'query');
        }
        if (config.enableMFA) {
            params.append('prompt', 'consent login');
            if (provider === 'auth0') {
                params.append('acr_values', 'http://schemas.openid.net/pape/policies/2007/06/multi-factor');
            }
        }
        const authUrl = `${config.authorizationEndpoint}?${params.toString()}`;
        logger.info(`Generated auth URL for provider ${provider}`);
        return authUrl;
    }
    /**
     * Handle OAuth callback and authenticate user
     */
    async handleCallback(provider, code, state) {
        const config = this.providers.get(provider);
        if (!config) {
            throw new Error(`Unknown provider: ${provider}`);
        }
        try {
            // Exchange code for tokens
            const decodedState = this.verifyState(state);
            const codeVerifier = decodedState?.v || '';
            const body = new URLSearchParams();
            body.append('grant_type', 'authorization_code');
            body.append('client_id', config.clientId);
            if (config.clientSecret)
                body.append('client_secret', config.clientSecret);
            body.append('code', code);
            body.append('redirect_uri', config.redirectUri);
            if (codeVerifier)
                body.append('code_verifier', codeVerifier);
            const tokenResponse = await axios_1.default.post(config.tokenEndpoint, body.toString(), {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            });
            const { access_token, id_token } = tokenResponse.data;
            // Verify ID token
            const decodedToken = await this.verifyIdToken(provider, id_token);
            // Get user info
            const userInfo = await this.getUserInfo(provider, access_token);
            // Map to internal user structure
            const oidcUser = await this.mapToOIDCUser(provider, decodedToken, userInfo);
            // Create or update user in database
            await this.upsertUser(oidcUser);
            logger.info(`Successfully authenticated user ${oidcUser.email} via ${provider}`);
            return oidcUser;
        }
        catch (error) {
            logger.error(`OAuth callback failed for provider ${provider}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw error;
        }
    }
    base64url(input) {
        return input.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }
    signState(obj) {
        const secret = process.env.PKCE_STATE_SECRET || process.env.JWT_SECRET || 'change-me';
        const payload = Buffer.from(JSON.stringify(obj)).toString('base64url');
        const sig = crypto_1.default
            .createHmac('sha256', secret)
            .update(payload)
            .digest('base64url');
        return `${payload}.${sig}`;
    }
    verifyState(state) {
        try {
            const secret = process.env.PKCE_STATE_SECRET || process.env.JWT_SECRET || 'change-me';
            const [payload, sig] = state.split('.');
            if (!payload || !sig)
                return null;
            const expected = crypto_1.default
                .createHmac('sha256', secret)
                .update(payload)
                .digest('base64url');
            if (expected !== sig)
                return null;
            return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
        }
        catch {
            return null;
        }
    }
    /**
     * Verify ID token using JWKS
     */
    async verifyIdToken(provider, idToken) {
        const config = this.providers.get(provider);
        // Get JWKS
        const jwks = await this.getJWKS(config.jwksUri);
        // Decode and verify token
        const decodedToken = jsonwebtoken_1.default.verify(idToken, jwks, {
            algorithms: ['RS256'],
            audience: config.clientId,
            issuer: config.issuer,
        });
        return decodedToken;
    }
    /**
     * Get user information from provider
     */
    async getUserInfo(provider, accessToken) {
        const config = this.providers.get(provider);
        if (!config.userInfoEndpoint) {
            return null;
        }
        const response = await axios_1.default.get(config.userInfoEndpoint, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });
        // Provider-specific user info processing
        if (provider === 'azure') {
            // Get user's groups from Microsoft Graph
            try {
                const groupsResponse = await axios_1.default.get('https://graph.microsoft.com/v1.0/me/memberOf', {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                });
                response.data.groups = groupsResponse.data.value.map((group) => group.displayName);
            }
            catch (error) {
                logger.warn(`Failed to fetch Azure AD groups: ${error instanceof Error ? error.message : 'Unknown error'}`);
                response.data.groups = [];
            }
        }
        return response.data;
    }
    /**
     * Get JWKS for token verification
     */
    async getJWKS(jwksUri) {
        // Check cache first
        if (this.jwksCache.has(jwksUri)) {
            return this.jwksCache.get(jwksUri);
        }
        const response = await axios_1.default.get(jwksUri);
        const jwks = response.data;
        // Cache for 1 hour
        this.jwksCache.set(jwksUri, jwks);
        setTimeout(() => {
            this.jwksCache.delete(jwksUri);
        }, 3600000);
        return jwks;
    }
    /**
     * Map provider user data to internal user structure
     */
    async mapToOIDCUser(provider, decodedToken, userInfo) {
        const config = this.providers.get(provider);
        // Extract user data based on provider
        let email;
        let name;
        let firstName = '';
        let lastName = '';
        let groups = [];
        switch (provider) {
            case 'auth0':
                email = decodedToken.email || userInfo?.email;
                name = decodedToken.name || userInfo?.name || email;
                firstName = decodedToken.given_name || userInfo?.given_name || '';
                lastName = decodedToken.family_name || userInfo?.family_name || '';
                groups =
                    decodedToken[config.groupsClaim] ||
                        userInfo?.[config.groupsClaim] ||
                        [];
                break;
            case 'azure':
                email =
                    decodedToken.email ||
                        decodedToken.preferred_username ||
                        userInfo?.mail ||
                        userInfo?.userPrincipalName;
                name = decodedToken.name || userInfo?.displayName || email;
                firstName = decodedToken.given_name || userInfo?.givenName || '';
                lastName = decodedToken.family_name || userInfo?.surname || '';
                groups = userInfo?.groups || [];
                break;
            case 'google':
                email = decodedToken.email || userInfo?.email;
                name = decodedToken.name || userInfo?.name || email;
                firstName = decodedToken.given_name || userInfo?.given_name || '';
                lastName = decodedToken.family_name || userInfo?.family_name || '';
                groups = []; // Google Workspace groups would need additional API calls
                break;
            default:
                email = decodedToken.email || userInfo?.email;
                name = decodedToken.name || userInfo?.name || email;
                firstName = decodedToken.given_name || userInfo?.given_name || '';
                lastName = decodedToken.family_name || userInfo?.family_name || '';
                groups = [];
        }
        // Map groups to roles using RBAC configuration
        const roles = this.mapGroupsToRoles(groups);
        // Determine tenant ID (simplified logic - in real implementation, this would be more sophisticated)
        const tenantId = await this.determineTenantId(email, groups, provider);
        return {
            id: crypto_1.default.randomUUID(),
            email,
            name,
            firstName,
            lastName,
            groups,
            roles,
            tenantId,
            provider,
            providerUserId: decodedToken.sub || decodedToken.oid,
            mfaEnrolled: decodedToken.amr?.includes('mfa') ||
                decodedToken.acr === 'mfa' ||
                false,
            lastLogin: new Date(),
        };
    }
    /**
     * Map OIDC groups to internal roles
     */
    mapGroupsToRoles(groups) {
        const roleMapping = {
            'IntelGraph-Admins': ['ADMIN'],
            'IntelGraph-Analysts': ['ANALYST'],
            'IntelGraph-Operators': ['OPERATOR'],
            'IntelGraph-Viewers': ['VIEWER'],
            // Azure AD group mappings
            'intelgraph-admin': ['ADMIN'],
            'intelgraph-analyst': ['ANALYST'],
            'intelgraph-operator': ['OPERATOR'],
            'intelgraph-viewer': ['VIEWER'],
        };
        const roles = new Set();
        for (const group of groups) {
            const mappedRoles = roleMapping[group];
            if (mappedRoles) {
                mappedRoles.forEach((role) => roles.add(role));
            }
        }
        // Default role if no mapping found
        if (roles.size === 0) {
            roles.add('VIEWER');
        }
        return Array.from(roles);
    }
    /**
     * Determine tenant ID for user
     */
    async determineTenantId(email, groups, provider) {
        // Simple email domain-based tenant mapping
        const domain = email.split('@')[1];
        const tenantMapping = {
            'intelgraph.ai': 'intelgraph-primary',
            'gov.example.com': 'government-tenant',
            'enterprise.example.com': 'enterprise-tenant',
        };
        return tenantMapping[domain] || 'default-tenant';
    }
    /**
     * Create or update user in database
     */
    async upsertUser(oidcUser) {
        const pool = (0, database_js_1.getPostgresPool)();
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const upsertQuery = `
        INSERT INTO users (
          id, email, username, first_name, last_name, role, 
          is_active, tenant_id, provider, provider_user_id,
          mfa_enrolled, last_login, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, true, $7, $8, $9, $10, $11, NOW(), NOW()
        )
        ON CONFLICT (email, provider) 
        DO UPDATE SET
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          role = EXCLUDED.role,
          tenant_id = EXCLUDED.tenant_id,
          mfa_enrolled = EXCLUDED.mfa_enrolled,
          last_login = EXCLUDED.last_login,
          updated_at = NOW()
        RETURNING id
      `;
            const result = await client.query(upsertQuery, [
                oidcUser.id,
                oidcUser.email,
                oidcUser.email, // Use email as username
                oidcUser.firstName,
                oidcUser.lastName,
                oidcUser.roles[0], // Primary role
                oidcUser.tenantId,
                oidcUser.provider,
                oidcUser.providerUserId,
                oidcUser.mfaEnrolled,
                oidcUser.lastLogin,
            ]);
            const userId = result.rows[0].id;
            // Update user groups
            await client.query('DELETE FROM user_groups WHERE user_id = $1', [
                userId,
            ]);
            for (const group of oidcUser.groups) {
                await client.query('INSERT INTO user_groups (user_id, group_name) VALUES ($1, $2)', [userId, group]);
            }
            await client.query('COMMIT');
            logger.info(`Upserted user ${oidcUser.email} with ID ${userId}`);
        }
        catch (error) {
            await client.query('ROLLBACK');
            logger.error(`Failed to upsert user: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw error;
        }
        finally {
            client.release();
        }
    }
    /**
     * SCIM user provisioning endpoint
     */
    async handleSCIMProvisioning(req, res) {
        try {
            const scimUser = req.body;
            // Map SCIM user to OIDC user format
            const oidcUser = {
                id: crypto_1.default.randomUUID(),
                email: scimUser.emails.find((e) => e.primary)?.value ||
                    scimUser.emails[0].value,
                name: `${scimUser.name.givenName} ${scimUser.name.familyName}`,
                firstName: scimUser.name.givenName,
                lastName: scimUser.name.familyName,
                groups: scimUser.groups?.map((g) => g.display) || [],
                roles: this.mapGroupsToRoles(scimUser.groups?.map((g) => g.display) || []),
                tenantId: await this.determineTenantId(scimUser.emails.find((e) => e.primary)?.value ||
                    scimUser.emails[0].value, scimUser.groups?.map((g) => g.display) || [], 'scim'),
                provider: 'scim',
                providerUserId: scimUser.id,
                mfaEnrolled: false,
                lastLogin: new Date(),
            };
            if (scimUser.active) {
                await this.upsertUser(oidcUser);
                res.status(201).json({
                    id: oidcUser.id,
                    userName: scimUser.userName,
                    active: true,
                });
            }
            else {
                // Deactivate user
                await this.deactivateUser(oidcUser.email);
                res.status(200).json({
                    id: oidcUser.id,
                    userName: scimUser.userName,
                    active: false,
                });
            }
        }
        catch (error) {
            logger.error(`SCIM provisioning failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            res.status(500).json({
                error: 'Internal server error',
                message: 'Failed to process SCIM request',
            });
        }
    }
    /**
     * Deactivate user account
     */
    async deactivateUser(email) {
        const pool = (0, database_js_1.getPostgresPool)();
        await pool.query('UPDATE users SET is_active = false, updated_at = NOW() WHERE email = $1', [email]);
        logger.info(`Deactivated user ${email}`);
    }
    /**
     * Get configured providers
     */
    getProviders() {
        return Array.from(this.providers.keys());
    }
    /**
     * Get provider configuration (safe - no secrets)
     */
    getProviderConfig(provider) {
        const config = this.providers.get(provider);
        if (!config) {
            return null;
        }
        return {
            name: config.name,
            issuer: config.issuer,
            clientId: config.clientId,
            redirectUri: config.redirectUri,
            scopes: config.scopes,
            enableMFA: config.enableMFA,
        };
    }
}
exports.default = OIDCAuthService;
