"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = exports.requireAuth = exports.generateTokens = exports.verifyToken = exports.getContext = exports.JWT_SECRET = void 0;
// @ts-nocheck
const graphql_1 = require("graphql");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const postgres_js_1 = require("../db/postgres.js");
const pino_1 = __importDefault(require("pino"));
const node_crypto_1 = require("node:crypto");
const loaders_js_1 = require("../graphql/loaders.js");
const tenantContext_js_1 = require("../security/tenantContext.js");
const config_js_1 = require("../config.js");
const logger = pino_1.default();
exports.JWT_SECRET = config_js_1.cfg.JWT_SECRET;
const getContext = async ({ req, }) => {
    const requestId = (0, node_crypto_1.randomUUID)();
    const loaders = (0, loaders_js_1.createLoaders)();
    try {
        // If user is already attached by middleware (e.g. for GraphQL route)
        if (req.user) {
            logger.info({ requestId, userId: req.user.id }, 'Authenticated request (middleware)');
            return {
                user: req.user,
                isAuthenticated: true,
                requestId,
                loaders,
                tenantContext: req.tenantContext ||
                    (0, tenantContext_js_1.extractTenantContext)(req, { strict: false }),
            };
        }
        const token = extractToken(req);
        if (!token) {
            if (process.env.ENABLE_INSECURE_DEV_AUTH === 'true' && process.env.NODE_ENV === 'development') {
                logger.info({ requestId }, 'Allowing unauthenticated request (ENABLE_INSECURE_DEV_AUTH)');
                return {
                    user: {
                        id: 'dev-user-1',
                        email: 'developer@intelgraph.com',
                        username: 'developer',
                        role: 'ADMIN',
                        token_version: 0,
                        tenantId: 'tenant_1',
                    },
                    isAuthenticated: true,
                    requestId,
                    loaders,
                    tenantContext: req.tenantContext ||
                        (0, tenantContext_js_1.extractTenantContext)(req, { strict: false }),
                };
            }
            logger.info({ requestId }, 'Unauthenticated request');
            return { isAuthenticated: false, requestId, loaders };
        }
        const user = await (0, exports.verifyToken)(token);
        logger.info({ requestId, userId: user.id }, 'Authenticated request');
        return {
            user,
            isAuthenticated: true,
            requestId,
            loaders,
            tenantContext: req.tenantContext ||
                (0, tenantContext_js_1.extractTenantContext)(req, { strict: false }),
        };
    }
    catch (error) {
        logger.warn({ requestId, error: error.message }, 'Authentication failed');
        return { isAuthenticated: false, requestId, loaders };
    }
};
exports.getContext = getContext;
const verifyToken = async (token) => {
    try {
        logger.info({ token: token === 'dev-token' ? 'dev-token' : '[REDACTED]' }, 'Verifying token');
        // For development, accept a simple test token
        if (process.env.NODE_ENV === 'development' && token === 'dev-token') {
            logger.info('Accepted dev-token');
            return {
                id: 'dev-user-1',
                email: 'developer@intelgraph.com',
                username: 'developer',
                role: 'ADMIN',
                token_version: 0,
                tenantId: 'tenant_1',
            };
        }
        // Verify JWT token
        const decoded = jsonwebtoken_1.default.verify(token, exports.JWT_SECRET);
        // Get user from database
        const pool = (0, postgres_js_1.getPostgresPool)();
        const result = await pool.query('SELECT id, email, username, role, token_version FROM users WHERE id = $1', [decoded.userId]);
        if (result.rows.length === 0) {
            throw new Error('User not found');
        }
        const user = result.rows[0];
        if (user.token_version !== decoded.token_version) {
            throw new Error('Token is revoked');
        }
        return user;
    }
    catch (error) {
        throw new graphql_1.GraphQLError('Invalid or expired token', {
            extensions: {
                code: 'UNAUTHENTICATED',
                http: { status: 401 },
            },
        });
    }
};
exports.verifyToken = verifyToken;
const generateTokens = (user) => {
    const accessToken = jsonwebtoken_1.default.sign({
        userId: user.id,
        email: user.email,
        role: user.role,
        token_version: user.token_version,
    }, exports.JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jsonwebtoken_1.default.sign({
        userId: user.id,
        token_version: user.token_version,
    }, exports.JWT_SECRET, { expiresIn: '7d' });
    return { accessToken, refreshToken };
};
exports.generateTokens = generateTokens;
const requireAuth = (context) => {
    if (!context.isAuthenticated || !context.user) {
        throw new graphql_1.GraphQLError('Authentication required', {
            extensions: {
                code: 'UNAUTHENTICATED',
                http: { status: 401 },
            },
        });
    }
    return context.user;
};
exports.requireAuth = requireAuth;
const requireRole = (context, requiredRole) => {
    const user = (0, exports.requireAuth)(context);
    if (user.role !== requiredRole && user.role !== 'ADMIN') {
        throw new graphql_1.GraphQLError('Insufficient permissions', {
            extensions: {
                code: 'FORBIDDEN',
                http: { status: 403 },
            },
        });
    }
    return user;
};
exports.requireRole = requireRole;
function extractToken(req) {
    const authHeader = req.headers?.authorization;
    if (authHeader?.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }
    return null;
}
