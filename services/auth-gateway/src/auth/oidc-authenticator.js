"use strict";
/**
 * OIDC Authenticator
 *
 * Handles OpenID Connect authentication for human operators
 * Supports standard OIDC providers (Okta, Auth0, Keycloak, Azure AD, etc.)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OIDCAuthenticator = void 0;
const openid_client_1 = require("openid-client");
const jose_1 = require("jose");
class OIDCAuthenticator {
    config;
    client = null;
    jwks = null;
    constructor(config) {
        this.config = config;
    }
    /**
     * Initialize OIDC client by discovering issuer configuration
     */
    async initialize() {
        if (!this.config.issuerUrl) {
            throw new Error('OIDC issuer URL not configured');
        }
        try {
            const issuer = await openid_client_1.Issuer.discover(this.config.issuerUrl);
            this.client = new issuer.Client({
                client_id: this.config.clientId,
                client_secret: this.config.clientSecret,
                redirect_uris: [this.config.redirectUri],
                response_types: ['code']
            });
            // Setup JWKS for token verification
            if (issuer.metadata.jwks_uri) {
                this.jwks = (0, jose_1.createRemoteJWKSet)(new URL(issuer.metadata.jwks_uri));
            }
            console.log('OIDC authenticator initialized', {
                issuer: issuer.metadata.issuer,
                authorizationEndpoint: issuer.metadata.authorization_endpoint
            });
        }
        catch (error) {
            console.error('Failed to initialize OIDC authenticator', error);
            throw error;
        }
    }
    /**
     * Get authorization URL for login flow
     */
    getAuthorizationUrl(state) {
        if (!this.client) {
            throw new Error('OIDC client not initialized');
        }
        return this.client.authorizationUrl({
            scope: this.config.scopes.join(' '),
            state: state || this.generateState()
        });
    }
    /**
     * Exchange authorization code for tokens
     */
    async exchangeCode(code, state) {
        if (!this.client) {
            throw new Error('OIDC client not initialized');
        }
        try {
            const tokenSet = await this.client.callback(this.config.redirectUri, { code, state }, { state });
            return tokenSet;
        }
        catch (error) {
            console.error('Failed to exchange authorization code', error);
            throw error;
        }
    }
    /**
     * Validate access token and extract identity
     */
    async validateToken(token) {
        if (!this.jwks) {
            // Fallback to client introspection if JWKS not available
            return this.introspectToken(token);
        }
        try {
            const { payload } = await (0, jose_1.jwtVerify)(token, this.jwks, {
                issuer: this.config.issuerUrl,
                audience: this.config.clientId
            });
            return this.extractIdentityFromClaims(payload);
        }
        catch (error) {
            console.error('Token validation failed', error);
            throw new Error('Invalid or expired token');
        }
    }
    /**
     * Introspect token using OIDC introspection endpoint
     */
    async introspectToken(token) {
        if (!this.client) {
            throw new Error('OIDC client not initialized');
        }
        try {
            const introspection = await this.client.introspect(token);
            if (!introspection.active) {
                throw new Error('Token is not active');
            }
            return this.extractIdentityFromClaims(introspection);
        }
        catch (error) {
            console.error('Token introspection failed', error);
            throw new Error('Invalid token');
        }
    }
    /**
     * Extract human identity from JWT claims
     */
    extractIdentityFromClaims(claims) {
        return {
            type: 'human',
            userId: claims.sub || '',
            email: claims.email || '',
            name: claims.name || claims.preferred_username || '',
            roles: this.extractRoles(claims),
            groups: this.extractGroups(claims),
            attributes: {
                emailVerified: claims.email_verified,
                locale: claims.locale,
                zoneinfo: claims.zoneinfo,
                ...claims
            }
        };
    }
    /**
     * Extract roles from claims
     * Supports various OIDC providers' role claim formats
     */
    extractRoles(claims) {
        // Try common role claim locations
        const roleSources = [
            claims.roles,
            claims.role,
            claims['cognito:groups'],
            claims.groups,
            claims.resource_access?.[this.config.clientId]?.roles
        ];
        for (const source of roleSources) {
            if (Array.isArray(source)) {
                return source;
            }
            if (typeof source === 'string') {
                return [source];
            }
        }
        return [];
    }
    /**
     * Extract groups from claims
     */
    extractGroups(claims) {
        const groupSources = [
            claims.groups,
            claims['cognito:groups'],
            claims.memberOf
        ];
        for (const source of groupSources) {
            if (Array.isArray(source)) {
                return source;
            }
            if (typeof source === 'string') {
                return [source];
            }
        }
        return [];
    }
    /**
     * Refresh access token using refresh token
     */
    async refreshToken(refreshToken) {
        if (!this.client) {
            throw new Error('OIDC client not initialized');
        }
        try {
            const tokenSet = await this.client.refresh(refreshToken);
            return tokenSet;
        }
        catch (error) {
            console.error('Token refresh failed', error);
            throw new Error('Failed to refresh token');
        }
    }
    /**
     * Revoke token
     */
    async revokeToken(token) {
        if (!this.client) {
            throw new Error('OIDC client not initialized');
        }
        try {
            await this.client.revoke(token);
        }
        catch (error) {
            console.error('Token revocation failed', error);
            // Don't throw - revocation failure is not critical
        }
    }
    /**
     * Generate random state for CSRF protection
     */
    generateState() {
        return Array.from(crypto.getRandomValues(new Uint8Array(32)))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }
}
exports.OIDCAuthenticator = OIDCAuthenticator;
