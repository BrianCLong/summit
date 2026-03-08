"use strict";
/**
 * IntelGraph Authentication Middleware
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
exports.requirePermission = requirePermission;
exports.revokeToken = revokeToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const jwks_rsa_1 = __importDefault(require("jwks-rsa"));
const logger_js_1 = require("../utils/logger.js");
const auditLog_js_1 = require("./auditLog.js");
const redis_js_1 = require("../db/redis.js");
const postgres_js_1 = require("../db/postgres.js");
// JWKS client for OIDC token verification
const jwksClientInstance = (0, jwks_rsa_1.default)({
    jwksUri: process.env.OIDC_JWKS_URI ||
        'https://auth.intelgraph.com/.well-known/jwks.json',
    cache: true,
    cacheMaxEntries: 5,
    cacheMaxAge: 600000, // 10 minutes
});
async function getSigningKey(kid) {
    const key = await jwksClientInstance.getSigningKey(kid);
    return key.getPublicKey();
}
async function authMiddleware(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({
                error: 'Authentication required',
                code: 'AUTH_TOKEN_MISSING',
            });
            return;
        }
        const token = authHeader.substring(7);
        // Check token blacklist
        const isBlacklisted = await redis_js_1.redisClient.exists(`blacklist:${token}`);
        if (isBlacklisted) {
            res.status(401).json({
                error: 'Token has been revoked',
                code: 'AUTH_TOKEN_REVOKED',
            });
            return;
        }
        // Decode token header to get key ID
        const decodedHeader = jsonwebtoken_1.default.decode(token, { complete: true });
        if (!decodedHeader || !decodedHeader.header.kid) {
            res.status(401).json({
                error: 'Invalid token format',
                code: 'AUTH_TOKEN_INVALID',
            });
            return;
        }
        // Get public key for verification
        const signingKey = await getSigningKey(decodedHeader.header.kid);
        // Verify token
        const payload = jsonwebtoken_1.default.verify(token, signingKey, {
            algorithms: ['RS256'],
            audience: process.env.OIDC_AUDIENCE || 'intelgraph-api',
            issuer: process.env.OIDC_ISSUER || 'https://auth.intelgraph.com',
        });
        // Check if user exists and is active
        const user = await getUserFromDatabase(payload.sub, payload.email);
        if (!user) {
            res.status(401).json({
                error: 'User not found or inactive',
                code: 'AUTH_USER_NOT_FOUND',
            });
            return;
        }
        // Attach user to request
        req.user = user;
        req.token = token;
        // Update last active timestamp
        await updateUserLastActive(user.id);
        // Log successful authentication
        logger_js_1.logger.info({
            message: 'User authenticated successfully',
            userId: user.id,
            email: user.email,
            tenantId: user.tenantId,
            role: user.role,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
        });
        (0, auditLog_js_1.auditLog)(req, 'auth.success', { userId: user.id });
        next();
    }
    catch (error) {
        logger_js_1.logger.error({
            message: 'Authentication failed',
            error: error instanceof Error ? error.message : String(error),
            ip: req.ip,
            userAgent: req.get('User-Agent'),
        });
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            res.status(401).json({
                error: 'Token has expired',
                code: 'AUTH_TOKEN_EXPIRED',
            });
        }
        else if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            res.status(401).json({
                error: 'Invalid token',
                code: 'AUTH_TOKEN_INVALID',
            });
        }
        else {
            res.status(401).json({
                error: 'Authentication failed',
                code: 'AUTH_FAILED',
            });
        }
    }
}
async function getUserFromDatabase(externalId, email) {
    try {
        // Try to find user by external ID first
        let user = await postgres_js_1.postgresPool.findOne('users', {
            external_id: externalId,
            is_active: true,
        });
        // Fallback to email if external ID not found (for migration scenarios)
        if (!user) {
            user = await postgres_js_1.postgresPool.findOne('users', {
                email: email,
                is_active: true,
            });
        }
        if (!user) {
            return null;
        }
        // Get user permissions
        const permissions = await getUserPermissions(user.id, user.role);
        return {
            id: user.id,
            email: user.email,
            name: user.name,
            tenantId: user.tenant_id,
            role: user.role,
            permissions,
        };
    }
    catch (error) {
        logger_js_1.logger.error({
            message: 'Failed to fetch user from database',
            externalId,
            email,
            error: error instanceof Error ? error.message : String(error),
        });
        return null;
    }
}
function mapClaimsToPermissions(payload) {
    const out = [];
    const scopes = (payload?.scope || '').split(' ').filter(Boolean);
    const claimsPerms = Array.isArray(payload?.permissions)
        ? payload.permissions
        : [];
    const groups = Array.isArray(payload?.groups) ? payload.groups : [];
    for (const s of scopes) {
        out.push(s);
    }
    for (const p of claimsPerms) {
        out.push(p);
    }
    if (groups.includes('admins'))
        out.push('*:*');
    return out;
}
async function getUserPermissions(userId, role, payload) {
    try {
        // Get permissions from cache first
        const cacheKey = `user:permissions:${userId}`;
        const cachedPermissions = await redis_js_1.redisClient.get(cacheKey);
        if (cachedPermissions) {
            return cachedPermissions;
        }
        // Base permissions by role
        const basePermissions = {
            viewer: [
                'entity:read',
                'relationship:read',
                'investigation:read',
                'copilot:query',
            ],
            analyst: [
                'entity:read',
                'entity:create',
                'entity:update',
                'relationship:read',
                'relationship:create',
                'relationship:update',
                'investigation:read',
                'investigation:create',
                'investigation:update',
                'analytics:run',
                'copilot:query',
            ],
            investigator: [
                'entity:read',
                'entity:create',
                'entity:update',
                'relationship:read',
                'relationship:create',
                'relationship:update',
                'investigation:read',
                'investigation:create',
                'investigation:update',
                'analytics:run',
                'analytics:export',
                'copilot:query',
                'data:export',
            ],
            supervisor: [
                'entity:read',
                'entity:create',
                'entity:update',
                'entity:delete',
                'relationship:read',
                'relationship:create',
                'relationship:update',
                'relationship:delete',
                'investigation:read',
                'investigation:create',
                'investigation:update',
                'investigation:delete',
                'analytics:run',
                'analytics:export',
                'copilot:query',
                'data:export',
                'audit:read',
                'user:read',
            ],
            admin: [
                '*:*', // Admin has all permissions
            ],
        };
        const permissions = basePermissions[role] || basePermissions['viewer'];
        const extra = mapClaimsToPermissions(payload || {});
        const merged = Array.from(new Set([...permissions, ...extra]));
        // Cache permissions for 15 minutes
        await redis_js_1.redisClient.set(cacheKey, merged, 900);
        return merged;
    }
    catch (error) {
        logger_js_1.logger.error({
            message: 'Failed to get user permissions',
            userId,
            role,
            error: error instanceof Error ? error.message : String(error),
        });
        // Return minimal permissions on error
        return ['entity:read'];
    }
}
async function updateUserLastActive(userId) {
    try {
        await postgres_js_1.postgresPool.update('users', { last_active_at: new Date() }, { id: userId });
    }
    catch (error) {
        // Don't fail auth if we can't update last active time
        logger_js_1.logger.warn({
            message: 'Failed to update user last active time',
            userId,
            error: error instanceof Error ? error.message : String(error),
        });
    }
}
// Middleware to check specific permissions
function requirePermission(permission) {
    return (req, res, next) => {
        const user = req.user;
        if (!user) {
            res.status(401).json({
                error: 'Authentication required',
                code: 'AUTH_REQUIRED',
            });
            return;
        }
        // Admin wildcard check
        if (user.permissions.includes('*:*')) {
            (0, auditLog_js_1.auditLog)(req, 'authz.allow', { permission });
            return next();
        }
        // Specific permission check
        if (user.permissions.includes(permission)) {
            (0, auditLog_js_1.auditLog)(req, 'authz.allow', { permission });
            return next();
        }
        // Wildcard permission check (e.g., "entity:*" allows "entity:read")
        const [resource, action] = permission.split(':');
        const wildcardPermission = `${resource}:*`;
        if (user.permissions.includes(wildcardPermission)) {
            (0, auditLog_js_1.auditLog)(req, 'authz.allow', { permission });
            return next();
        }
        (0, auditLog_js_1.auditLog)(req, 'authz.deny', { permission });
        res.status(403).json({
            error: 'Insufficient permissions',
            code: 'AUTH_INSUFFICIENT_PERMISSIONS',
            required: permission,
        });
    };
}
// Token revocation endpoint
async function revokeToken(req, res) {
    try {
        const token = req.token;
        const user = req.user;
        if (!token) {
            res.status(400).json({
                error: 'No token to revoke',
                code: 'AUTH_NO_TOKEN',
            });
            return;
        }
        // Add token to blacklist with expiration matching token expiration
        const decoded = jsonwebtoken_1.default.decode(token);
        const expirationTime = decoded.exp * 1000; // Convert to milliseconds
        const ttlSeconds = Math.max(0, Math.floor((expirationTime - Date.now()) / 1000));
        await redis_js_1.redisClient.set(`blacklist:${token}`, 'revoked', ttlSeconds);
        logger_js_1.logger.info({
            message: 'Token revoked successfully',
            userId: user.id,
            tokenExp: expirationTime,
        });
        res.json({
            message: 'Token revoked successfully',
        });
    }
    catch (error) {
        logger_js_1.logger.error({
            message: 'Failed to revoke token',
            error: error instanceof Error ? error.message : String(error),
        });
        res.status(500).json({
            error: 'Failed to revoke token',
            code: 'AUTH_REVOKE_FAILED',
        });
    }
}
