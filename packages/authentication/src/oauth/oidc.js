"use strict";
/**
 * OpenID Connect (OIDC) Support
 *
 * Extends OAuth 2.0 with identity layer
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OIDCProvider = void 0;
const logger_js_1 = require("../utils/logger.js");
const logger = (0, logger_js_1.createLogger)('oidc');
class OIDCProvider {
    config;
    userInfoStore = new Map();
    constructor(config) {
        this.config = config;
    }
    async getUserInfo(accessToken) {
        // In production, validate access token and fetch user info from database
        const userInfo = this.userInfoStore.get(accessToken);
        if (!userInfo) {
            logger.warn('User info not found for token');
            return null;
        }
        return userInfo;
    }
    storeUserInfo(userId, userInfo) {
        this.userInfoStore.set(userId, userInfo);
        logger.info('User info stored', { sub: userInfo.sub });
    }
    getDiscoveryDocument() {
        return {
            issuer: this.config.issuer,
            authorization_endpoint: this.config.authorizationEndpoint,
            token_endpoint: this.config.tokenEndpoint,
            userinfo_endpoint: this.config.userinfoEndpoint,
            jwks_uri: this.config.jwksUri,
            scopes_supported: this.config.supportedScopes,
            claims_supported: this.config.supportedClaims,
            response_types_supported: ['code', 'token', 'id_token', 'code token', 'code id_token', 'token id_token', 'code token id_token'],
            subject_types_supported: ['public'],
            id_token_signing_alg_values_supported: ['RS256', 'HS256'],
            token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post'],
        };
    }
}
exports.OIDCProvider = OIDCProvider;
