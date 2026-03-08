"use strict";
/**
 * OAuth 2.0 Provider
 *
 * Implements OAuth 2.0 authorization flows:
 * - Authorization Code Flow
 * - Client Credentials Flow
 * - Refresh Token Flow
 * - PKCE support
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OAuthProvider = exports.GrantType = void 0;
const crypto_1 = require("crypto");
const logger_js_1 = require("../utils/logger.js");
const logger = (0, logger_js_1.createLogger)('oauth-provider');
var GrantType;
(function (GrantType) {
    GrantType["AUTHORIZATION_CODE"] = "authorization_code";
    GrantType["CLIENT_CREDENTIALS"] = "client_credentials";
    GrantType["REFRESH_TOKEN"] = "refresh_token";
    GrantType["PASSWORD"] = "password";
})(GrantType || (exports.GrantType = GrantType = {}));
class OAuthProvider {
    config;
    authorizationCodes = new Map();
    refreshTokens = new Map();
    constructor(config) {
        this.config = config;
    }
    generateAuthorizationUrl(scopes, state, codeChallenge) {
        const params = new URLSearchParams({
            response_type: 'code',
            client_id: this.config.clientId,
            redirect_uri: this.config.redirectUri,
            scope: scopes.join(' '),
            state: state || this.generateState(),
        });
        if (codeChallenge && this.config.usePKCE) {
            params.append('code_challenge', codeChallenge);
            params.append('code_challenge_method', 'S256');
        }
        return `${this.config.authorizationEndpoint}?${params.toString()}`;
    }
    async handleAuthorizationRequest(request, userId) {
        // Validate request
        this.validateAuthorizationRequest(request);
        // Generate authorization code
        const code = this.generateAuthorizationCode();
        // Store authorization code with metadata
        this.authorizationCodes.set(code, {
            userId,
            clientId: request.clientId,
            redirectUri: request.redirectUri,
            scope: request.scope,
            codeChallenge: request.codeChallenge,
            createdAt: Date.now(),
            expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
        });
        logger.info('Authorization code generated', { userId, clientId: request.clientId });
        return code;
    }
    async exchangeCodeForToken(request) {
        if (request.grantType !== GrantType.AUTHORIZATION_CODE) {
            throw new Error('Invalid grant type');
        }
        if (!request.code) {
            throw new Error('Authorization code required');
        }
        // Retrieve authorization code data
        const codeData = this.authorizationCodes.get(request.code);
        if (!codeData) {
            throw new Error('Invalid authorization code');
        }
        // Validate authorization code
        if (Date.now() > codeData.expiresAt) {
            this.authorizationCodes.delete(request.code);
            throw new Error('Authorization code expired');
        }
        if (codeData.clientId !== request.clientId) {
            throw new Error('Client ID mismatch');
        }
        if (codeData.redirectUri !== request.redirectUri) {
            throw new Error('Redirect URI mismatch');
        }
        // Validate PKCE if used
        if (codeData.codeChallenge && !request.codeVerifier) {
            throw new Error('Code verifier required');
        }
        // Delete authorization code (one-time use)
        this.authorizationCodes.delete(request.code);
        // Generate tokens
        const accessToken = this.generateAccessToken(codeData.userId, codeData.scope);
        const refreshToken = this.generateRefreshToken(codeData.userId);
        // Store refresh token
        this.refreshTokens.set(refreshToken, {
            userId: codeData.userId,
            clientId: codeData.clientId,
            scope: codeData.scope,
            createdAt: Date.now(),
        });
        logger.info('Token exchange successful', { userId: codeData.userId });
        return {
            accessToken,
            tokenType: 'Bearer',
            expiresIn: 3600,
            refreshToken,
            scope: codeData.scope,
        };
    }
    async refreshAccessToken(refreshToken) {
        const tokenData = this.refreshTokens.get(refreshToken);
        if (!tokenData) {
            throw new Error('Invalid refresh token');
        }
        // Generate new access token
        const accessToken = this.generateAccessToken(tokenData.userId, tokenData.scope);
        logger.info('Access token refreshed', { userId: tokenData.userId });
        return {
            accessToken,
            tokenType: 'Bearer',
            expiresIn: 3600,
            scope: tokenData.scope,
        };
    }
    revokeToken(token) {
        this.refreshTokens.delete(token);
        logger.info('Token revoked');
    }
    validateAuthorizationRequest(request) {
        if (!request.clientId || !request.redirectUri || !request.scope) {
            throw new Error('Invalid authorization request');
        }
        if (request.clientId !== this.config.clientId) {
            throw new Error('Invalid client ID');
        }
        if (request.redirectUri !== this.config.redirectUri) {
            throw new Error('Invalid redirect URI');
        }
    }
    generateAuthorizationCode() {
        return (0, crypto_1.randomBytes)(32).toString('base64url');
    }
    generateAccessToken(userId, scope) {
        // This should use JWTManager in production
        return (0, crypto_1.randomBytes)(32).toString('base64url');
    }
    generateRefreshToken(userId) {
        return (0, crypto_1.randomBytes)(32).toString('base64url');
    }
    generateState() {
        return (0, crypto_1.randomBytes)(16).toString('base64url');
    }
}
exports.OAuthProvider = OAuthProvider;
