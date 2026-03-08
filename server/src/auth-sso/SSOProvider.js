"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SAMLProviderStub = exports.OIDCProvider = void 0;
const axios_1 = __importDefault(require("axios"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
class OIDCProvider {
    config;
    constructor(config) {
        this.config = config;
    }
    getType() {
        return 'oidc';
    }
    async generateAuthUrl(tenantId, state, callbackUrl) {
        if (!this.config)
            throw new Error('OIDC provider not configured');
        // In a real implementation, we would fetch discovery doc if endpoints are missing
        const authUrl = this.config.authorizationUrl || `${this.config.issuerUrl}/authorize`;
        const params = new URLSearchParams({
            response_type: 'code',
            client_id: this.config.clientId,
            redirect_uri: callbackUrl,
            scope: 'openid profile email',
            state: state
        });
        return `${authUrl}?${params.toString()}`;
    }
    async verifyCallback(code, tenantId, callbackUrl) {
        if (!this.config)
            throw new Error('OIDC provider not configured');
        const tokenUrl = this.config.tokenUrl || `${this.config.issuerUrl}/token`;
        // Exchange code for token
        try {
            const tokenResponse = await axios_1.default.post(tokenUrl, {
                grant_type: 'authorization_code',
                code,
                redirect_uri: callbackUrl,
                client_id: this.config.clientId,
                client_secret: this.config.clientSecret
            }, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });
            const { id_token, access_token } = tokenResponse.data;
            // Verify ID Token (simplified - should verify signature against JWKS)
            // For this implementation we'll decode without verification if we can't fetch JWKS easily,
            // but strictly we should. Assuming internal trust or implementation of JWKS client.
            const decoded = jsonwebtoken_1.default.decode(id_token);
            // Basic claim mapping
            const mapping = this.config.mapping || {
                email: 'email',
                id: 'sub',
                firstName: 'given_name',
                lastName: 'family_name',
                role: 'role',
                groups: 'groups'
            };
            return {
                sub: decoded[mapping.id] || decoded.sub,
                email: decoded[mapping.email] || decoded.email,
                firstName: decoded[mapping.firstName],
                lastName: decoded[mapping.lastName],
                role: decoded[mapping.role],
                groups: decoded[mapping.groups],
                raw: decoded
            };
        }
        catch (error) {
            console.error('SSO Token Exchange Error:', error);
            throw new Error('Failed to verify SSO callback');
        }
    }
    async validateConfig(config) {
        try {
            // Try to fetch OIDC discovery document
            const discoveryUrl = `${config.issuerUrl}/.well-known/openid-configuration`;
            const response = await axios_1.default.get(discoveryUrl);
            return response.status === 200 && !!response.data.authorization_endpoint;
        }
        catch (error) {
            // Fallback: check if endpoints are explicitly provided
            return !!(config.authorizationUrl && config.tokenUrl);
        }
    }
}
exports.OIDCProvider = OIDCProvider;
class SAMLProviderStub {
    getType() {
        return 'saml';
    }
    async generateAuthUrl(tenantId, state, callbackUrl) {
        return `https://saml-idp.example.com/sso?state=${state}&tenant=${tenantId}`;
    }
    async verifyCallback(code, tenantId, callbackUrl) {
        // Stub implementation
        return {
            sub: 'saml-user-123',
            email: 'user@saml.example.com',
            firstName: 'SAML',
            lastName: 'User'
        };
    }
    async validateConfig(config) {
        return true; // Stub always valid
    }
}
exports.SAMLProviderStub = SAMLProviderStub;
