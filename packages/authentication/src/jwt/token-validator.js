"use strict";
/**
 * Token Validator
 *
 * Validates JWT tokens with various security checks
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenValidator = void 0;
const logger_js_1 = require("../utils/logger.js");
const logger = (0, logger_js_1.createLogger)('token-validator');
class TokenValidator {
    jwtManager;
    revokedTokens = new Set();
    constructor(jwtManager) {
        this.jwtManager = jwtManager;
    }
    async validate(token, options = {}) {
        // Check if token is revoked
        if (this.revokedTokens.has(token)) {
            throw new Error('Token has been revoked');
        }
        // Verify token signature and decode
        let payload;
        try {
            payload = this.jwtManager.verifyAccessToken(token);
        }
        catch (error) {
            logger.error('Token validation failed', {
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
        // Check required scopes
        if (options.requiredScopes && options.requiredScopes.length > 0) {
            if (!this.hasRequiredScopes(payload, options.requiredScopes)) {
                throw new Error('Token does not have required scopes');
            }
        }
        // Check required roles
        if (options.requiredRoles && options.requiredRoles.length > 0) {
            if (!this.hasRequiredRoles(payload, options.requiredRoles)) {
                throw new Error('Token does not have required roles');
            }
        }
        return payload;
    }
    revokeToken(token) {
        this.revokedTokens.add(token);
        logger.info('Token revoked');
    }
    hasRequiredScopes(payload, requiredScopes) {
        if (!payload.scopes) {
            return false;
        }
        return requiredScopes.every(scope => payload.scopes.includes(scope));
    }
    hasRequiredRoles(payload, requiredRoles) {
        if (!payload.roles) {
            return false;
        }
        return requiredRoles.every(role => payload.roles.includes(role));
    }
    clearRevokedTokens() {
        this.revokedTokens.clear();
        logger.info('Revoked tokens cleared');
    }
}
exports.TokenValidator = TokenValidator;
