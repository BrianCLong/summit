"use strict";
// @ts-nocheck
// server/src/conductor/auth/rbac-middleware.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rbacManager = void 0;
exports.authenticateUser = authenticateUser;
exports.requirePermission = requirePermission;
exports.requireAnyPermission = requireAnyPermission;
exports.getUserInfo = getUserInfo;
const jwt_rotation_js_1 = require("./jwt-rotation.js");
const logger_js_1 = __importDefault(require("../../config/logger.js"));
class RBACManager {
    config;
    permissionCache = new Map();
    constructor() {
        const enabledEnv = process.env.RBAC_ENABLED;
        const enabled = enabledEnv === undefined
            ? true
            : !['false', '0', 'no'].includes(enabledEnv.toLowerCase());
        this.config = {
            enabled,
            rolesClaim: process.env.RBAC_ROLES_CLAIM || 'groups',
            defaultRole: process.env.RBAC_DEFAULT_ROLE || 'viewer',
            roles: {
                admin: {
                    name: 'admin',
                    description: 'Full administrative access',
                    permissions: ['*'],
                },
                operator: {
                    name: 'operator',
                    description: 'Workflow and task management',
                    permissions: [
                        'workflow:read',
                        'workflow:execute',
                        'workflow:create',
                        'workflow:update',
                        'workflow:delete',
                        'task:read',
                        'task:execute',
                        'task:create',
                        'metrics:read',
                        'evidence:read',
                        'evidence:create',
                        'policies:read',
                        'serving:read',
                        'serving:execute',
                        'cti:read',
                        'cti:write',
                        'cti:export',
                        'cti:share',
                        'pricing:read',
                        'pricing:refresh',
                        'capacity:read',
                        'capacity:reserve',
                        'capacity:release',
                        'flags:read',
                    ],
                },
                analyst: {
                    name: 'analyst',
                    description: 'Analysis execution and read access',
                    permissions: [
                        'workflow:read',
                        'workflow:execute',
                        'task:read',
                        'task:execute',
                        'metrics:read',
                        'evidence:read',
                        'evidence:create',
                        'policies:read',
                        'serving:read',
                        'serving:execute',
                        'cti:read',
                        'cti:export',
                        'pricing:read',
                        'capacity:read',
                    ],
                },
                viewer: {
                    name: 'viewer',
                    description: 'Read-only access',
                    permissions: [
                        'workflow:read',
                        'task:read',
                        'metrics:read',
                        'evidence:read',
                        'policies:read',
                        'serving:read',
                        'cti:read',
                        'pricing:read',
                    ],
                },
            },
        };
        this.loadConfigFromEnvironment();
        this.buildPermissionCache();
    }
    loadConfigFromEnvironment() {
        try {
            if (process.env.RBAC_CONFIG) {
                const envConfig = JSON.parse(process.env.RBAC_CONFIG);
                this.config = { ...this.config, ...envConfig };
            }
        }
        catch (error) {
            logger_js_1.default.warn('⚠️ Failed to parse RBAC_CONFIG from environment, using defaults', { error: error.message });
        }
    }
    buildPermissionCache() {
        for (const [roleName, role] of Object.entries(this.config.roles)) {
            const permissions = new Set();
            for (const permission of role.permissions) {
                if (permission === '*') {
                    // Wildcard permission grants all
                    permissions.add('*');
                }
                else {
                    permissions.add(permission.toLowerCase());
                }
            }
            this.permissionCache.set(roleName, permissions);
        }
        logger_js_1.default.info('🔐 RBAC permission cache built', {
            roles: Object.keys(this.config.roles),
            enabled: this.config.enabled,
        });
    }
    getUserRoles(user) {
        if (!this.config.enabled) {
            return ['admin']; // Default to admin when RBAC disabled
        }
        const rolesFromClaim = user[this.config.rolesClaim] ||
            [];
        const rolesFromUser = user.roles || [];
        const allRoles = [...new Set([...rolesFromClaim, ...rolesFromUser])];
        // If no roles found, assign default role
        if (allRoles.length === 0) {
            return [this.config.defaultRole];
        }
        return allRoles.filter((role) => this.config.roles[role]);
    }
    getUserPermissions(user) {
        const roles = this.getUserRoles(user);
        const userPermissions = new Set();
        for (const role of roles) {
            const rolePermissions = this.permissionCache.get(role);
            if (rolePermissions) {
                if (rolePermissions.has('*')) {
                    return new Set(['*']); // Wildcard grants all permissions
                }
                rolePermissions.forEach((permission) => userPermissions.add(permission));
            }
        }
        return userPermissions;
    }
    hasPermission(user, requiredPermission) {
        if (!this.config.enabled) {
            return true; // Allow all when RBAC disabled
        }
        const userPermissions = this.getUserPermissions(user);
        if (userPermissions.has('*')) {
            return true; // Wildcard permission
        }
        const normalizedPermission = requiredPermission.toLowerCase();
        // Check exact permission match
        if (userPermissions.has(normalizedPermission)) {
            return true;
        }
        // Check wildcard resource permissions (e.g., workflow:* matches workflow:read)
        const [resource] = normalizedPermission.split(':');
        if (userPermissions.has(`${resource}:*`)) {
            return true;
        }
        return false;
    }
    getConfig() {
        return { ...this.config };
    }
}
exports.rbacManager = new RBACManager();
/**
 * Authentication middleware - extracts user from JWT or OAuth proxy headers
 */
function authenticateUser(req, res, next) {
    try {
        let user = null;
        // Try OAuth2 Proxy headers first (production)
        if (req.headers['x-auth-request-user'] &&
            req.headers['x-auth-request-email']) {
            const groups = req.headers['x-auth-request-groups']
                ? req.headers['x-auth-request-groups']
                    .split(',')
                    .map((g) => g.trim())
                : [];
            user = {
                userId: req.headers['x-auth-request-user'],
                sub: req.headers['x-auth-request-user'],
                email: req.headers['x-auth-request-email'],
                name: req.headers['x-auth-request-preferred-username'],
                groups,
                roles: groups,
                tenantId: req.headers['x-tenant-id'] || 'default',
            };
        }
        // Try Authorization Bearer token (development/API)
        else if (req.headers.authorization) {
            const token = req.headers.authorization.replace('Bearer ', '');
            jwt_rotation_js_1.jwtRotationManager
                .verifyToken(token)
                .then((payload) => {
                if (typeof payload === 'object' && payload.sub) {
                    user = {
                        userId: payload.sub,
                        sub: payload.sub,
                        email: payload.email || '',
                        name: payload.name,
                        groups: payload.groups || [],
                        roles: payload.roles || payload.groups || [],
                        tenantId: payload.tenantId || 'default',
                    };
                    req.user = user;
                    logger_js_1.default.debug('👤 User authenticated via JWT', {
                        userId: user.userId,
                        roles: exports.rbacManager.getUserRoles(user),
                    });
                    next();
                }
                else {
                    res.status(401).json({ error: 'Invalid token payload' });
                }
            })
                .catch((error) => {
                logger_js_1.default.warn('🚫 JWT token verification failed', {
                    error: error.message,
                });
                res.status(401).json({ error: 'Invalid token' });
            });
            return;
        }
        // Development bypass
        else if (process.env.NODE_ENV === 'development' ||
            process.env.AUTH_BYPASS === 'true') {
            user = {
                userId: 'dev-user',
                sub: 'dev-user',
                email: 'dev@intelgraph.io',
                name: 'Development User',
                groups: ['admin'],
                roles: ['admin'],
                tenantId: 'development',
            };
        }
        if (!user) {
            logger_js_1.default.warn('🚫 Authentication required but no valid credentials found');
            return res.status(401).json({
                error: 'Authentication required',
                message: 'Please provide valid JWT token or OAuth proxy headers',
            });
        }
        req.user = user;
        logger_js_1.default.debug('👤 User authenticated', {
            userId: user.userId,
            email: user.email,
            roles: exports.rbacManager.getUserRoles(user),
            method: req.headers['x-auth-request-user'] ? 'oauth-proxy' : 'jwt',
        });
        next();
    }
    catch (error) {
        logger_js_1.default.error('❌ Authentication middleware error', {
            error: error.message,
        });
        res.status(500).json({ error: 'Authentication service error' });
    }
}
/**
 * Authorization middleware factory - checks if user has required permission
 */
function requirePermission(permission) {
    return (req, res, next) => {
        try {
            if (!exports.rbacManager.getConfig().enabled) {
                return next();
            }
            const user = req.user;
            if (!user) {
                logger_js_1.default.warn('🚫 Authorization check failed - no authenticated user');
                return res.status(401).json({ error: 'Authentication required' });
            }
            if (!exports.rbacManager.hasPermission(user, permission)) {
                const userRoles = exports.rbacManager.getUserRoles(user);
                const userPermissions = Array.from(exports.rbacManager.getUserPermissions(user));
                logger_js_1.default.warn('🚫 Authorization denied', {
                    userId: user.userId,
                    requiredPermission: permission,
                    userRoles,
                    userPermissions,
                });
                return res.status(403).json({
                    error: 'Insufficient permissions',
                    required: permission,
                    userRoles,
                    userPermissions: userPermissions.slice(0, 10), // Limit for security
                });
            }
            logger_js_1.default.debug('✅ Authorization granted', {
                userId: user.userId,
                permission,
                roles: exports.rbacManager.getUserRoles(user),
            });
            next();
        }
        catch (error) {
            logger_js_1.default.error('❌ Authorization middleware error', {
                error: error.message,
                permission,
            });
            res.status(500).json({ error: 'Authorization service error' });
        }
    };
}
/**
 * Multi-permission authorization middleware
 */
function requireAnyPermission(...permissions) {
    return (req, res, next) => {
        try {
            if (!exports.rbacManager.getConfig().enabled) {
                return next();
            }
            const user = req.user;
            if (!user) {
                return res.status(401).json({ error: 'Authentication required' });
            }
            const hasAnyPermission = permissions.some((permission) => exports.rbacManager.hasPermission(user, permission));
            if (!hasAnyPermission) {
                logger_js_1.default.warn('🚫 Authorization denied - no matching permissions', {
                    userId: user.userId,
                    requiredPermissions: permissions,
                    userRoles: exports.rbacManager.getUserRoles(user),
                });
                return res.status(403).json({
                    error: 'Insufficient permissions',
                    required: permissions,
                    userRoles: exports.rbacManager.getUserRoles(user),
                });
            }
            next();
        }
        catch (error) {
            logger_js_1.default.error('❌ Multi-permission authorization error', {
                error: error.message,
            });
            res.status(500).json({ error: 'Authorization service error' });
        }
    };
}
/**
 * Get user information endpoint
 */
function getUserInfo(req, res) {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        const userRoles = exports.rbacManager.getUserRoles(user);
        const userPermissions = Array.from(exports.rbacManager.getUserPermissions(user));
        res.json({
            user: {
                userId: user.userId,
                email: user.email,
                name: user.name,
                tenantId: user.tenantId,
            },
            authorization: {
                roles: userRoles,
                permissions: userPermissions,
                config: {
                    rbacEnabled: exports.rbacManager.getConfig().enabled,
                    defaultRole: exports.rbacManager.getConfig().defaultRole,
                },
            },
        });
    }
    catch (error) {
        logger_js_1.default.error('❌ Get user info error', { error: error.message });
        res.status(500).json({ error: 'Failed to get user information' });
    }
}
