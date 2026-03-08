"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requirePermission = requirePermission;
exports.requireAnyPermission = requireAnyPermission;
exports.requireAllPermissions = requireAllPermissions;
exports.requireRole = requireRole;
const AuthService_js_1 = __importDefault(require("../services/AuthService.js"));
const authService = new AuthService_js_1.default();
/**
 * Middleware to require specific permission(s)
 */
function requirePermission(permission) {
    return (req, res, next) => {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        if (!authService.hasPermission(user, permission)) {
            return res.status(403).json({
                error: 'Insufficient permissions',
                required: permission,
                userRole: user.role,
            });
        }
        next();
    };
}
/**
 * Middleware to require any of the specified permissions
 */
function requireAnyPermission(permissions) {
    return (req, res, next) => {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        const hasAny = permissions.some(perm => user.permissions?.includes(perm) || user.role === 'admin');
        if (!hasAny) {
            return res.status(403).json({
                error: 'Insufficient permissions',
                required: `Any of: ${permissions.join(', ')}`,
                userRole: user.role,
            });
        }
        next();
    };
}
/**
 * Middleware to require all of the specified permissions
 */
function requireAllPermissions(permissions) {
    return (req, res, next) => {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        const hasAll = permissions.every(perm => user.permissions?.includes(perm) || user.role === 'admin');
        if (!hasAll) {
            return res.status(403).json({
                error: 'Insufficient permissions',
                required: `All of: ${permissions.join(', ')}`,
                userRole: user.role,
            });
        }
        next();
    };
}
/**
 * Middleware for role-based access (convenience wrapper)
 */
function requireRole(role) {
    return (req, res, next) => {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        if (user.role?.toUpperCase() !== role.toUpperCase() &&
            user.role?.toUpperCase() !== 'ADMIN') {
            return res.status(403).json({
                error: 'Insufficient role',
                required: role,
                userRole: user.role,
            });
        }
        next();
    };
}
