"use strict";
// @ts-nocheck
/**
 * Authentication Middleware
 *
 * Express middleware for authentication and authorization
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthMiddleware = void 0;
const logger_js_1 = require("./utils/logger.js");
const logger = (0, logger_js_1.createLogger)('auth-middleware');
class AuthMiddleware {
    jwtManager;
    apiKeyManager;
    rbacManager;
    tokenValidator;
    constructor(config) {
        this.jwtManager = config.jwtManager;
        this.apiKeyManager = config.apiKeyManager;
        this.rbacManager = config.rbacManager;
        this.tokenValidator = config.tokenValidator;
    }
    authenticate() {
        return async (req, res, next) => {
            try {
                // Try JWT authentication
                const token = this.extractBearerToken(req);
                if (token && this.jwtManager && this.tokenValidator) {
                    const payload = await this.tokenValidator.validate(token);
                    req.user = payload;
                    return next();
                }
                // Try API key authentication
                const apiKey = this.extractAPIKey(req);
                if (apiKey && this.apiKeyManager) {
                    const validatedKey = this.apiKeyManager.validateAPIKey(apiKey);
                    if (validatedKey) {
                        req.apiKey = validatedKey;
                        return next();
                    }
                }
                // No valid authentication found
                res.status(401).json({ error: 'Unauthorized' });
            }
            catch (error) {
                logger.error('Authentication failed', {
                    error: error instanceof Error ? error.message : String(error),
                });
                res.status(401).json({ error: 'Unauthorized' });
            }
        };
    }
    requireScopes(scopes) {
        return async (req, res, next) => {
            if (!req.user) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const hasScopes = scopes.every(scope => req.user.scopes?.includes(scope));
            if (!hasScopes) {
                logger.warn('Insufficient scopes', {
                    required: scopes,
                    provided: req.user.scopes,
                });
                return res.status(403).json({ error: 'Forbidden: Insufficient scopes' });
            }
            next();
        };
    }
    requireRoles(roles) {
        return async (req, res, next) => {
            if (!req.user) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const hasRoles = roles.every(role => req.user.roles?.includes(role));
            if (!hasRoles) {
                logger.warn('Insufficient roles', {
                    required: roles,
                    provided: req.user.roles,
                });
                return res.status(403).json({ error: 'Forbidden: Insufficient roles' });
            }
            next();
        };
    }
    requirePermission(resource, action) {
        return async (req, res, next) => {
            if (!req.user || !this.rbacManager) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const hasPermission = this.rbacManager.hasPermission(req.user.sub, resource, action);
            if (!hasPermission) {
                logger.warn('Insufficient permissions', {
                    userId: req.user.sub,
                    resource,
                    action,
                });
                return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
            }
            next();
        };
    }
    extractBearerToken(req) {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return null;
        }
        return authHeader.substring(7);
    }
    extractAPIKey(req) {
        // Check X-API-Key header
        const headerKey = req.headers['x-api-key'];
        if (headerKey) {
            return headerKey;
        }
        // Check query parameter
        const queryKey = req.query.api_key;
        if (queryKey) {
            return queryKey;
        }
        return null;
    }
}
exports.AuthMiddleware = AuthMiddleware;
