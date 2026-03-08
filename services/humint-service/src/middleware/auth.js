"use strict";
/**
 * Authentication Middleware
 *
 * JWT-based authentication with role and clearance level validation.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
exports.requireRoles = requireRoles;
exports.requireClearance = requireClearance;
exports.requireCompartment = requireCompartment;
const error_handler_js_1 = require("./error-handler.js");
/**
 * Simple JWT decode for development
 * In production, use proper JWT verification with JWKS
 */
function decodeJwt(token) {
    try {
        const parts = token.split('.');
        if (parts.length !== 3)
            return null;
        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
        return {
            id: payload.sub || payload.userId,
            tenantId: payload.tenantId || 'default',
            email: payload.email || '',
            name: payload.name || '',
            roles: payload.roles || [],
            clearanceLevel: payload.clearanceLevel || 'UNCLASSIFIED',
            compartments: payload.compartments || [],
        };
    }
    catch {
        return null;
    }
}
function authMiddleware(ctx) {
    return (req, res, next) => {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            // Allow development bypass
            if (process.env.NODE_ENV === 'development' && process.env.AUTH_BYPASS === 'true') {
                req.user = {
                    id: 'dev-user',
                    tenantId: 'dev-tenant',
                    email: 'dev@example.com',
                    name: 'Development User',
                    roles: ['admin', 'handler', 'analyst'],
                    clearanceLevel: 'TOP_SECRET_SCI',
                    compartments: ['HUMINT', 'SIGINT', 'COMINT'],
                };
                req.tenantId = req.user.tenantId;
                next();
                return;
            }
            next(new error_handler_js_1.UnauthorizedError('Missing authorization header'));
            return;
        }
        const token = authHeader.slice(7);
        const user = decodeJwt(token);
        if (!user) {
            next(new error_handler_js_1.UnauthorizedError('Invalid token'));
            return;
        }
        req.user = user;
        req.tenantId = user.tenantId;
        next();
    };
}
/**
 * Require specific roles
 */
function requireRoles(...roles) {
    return (req, _res, next) => {
        if (!req.user) {
            next(new error_handler_js_1.UnauthorizedError());
            return;
        }
        const hasRole = roles.some((role) => req.user.roles.includes(role));
        if (!hasRole) {
            next(new error_handler_js_1.ForbiddenError(`Required roles: ${roles.join(', ')}`));
            return;
        }
        next();
    };
}
/**
 * Require minimum clearance level
 */
const CLEARANCE_ORDER = [
    'UNCLASSIFIED',
    'CONFIDENTIAL',
    'SECRET',
    'TOP_SECRET',
    'TOP_SECRET_SCI',
];
function requireClearance(minLevel) {
    return (req, _res, next) => {
        if (!req.user) {
            next(new error_handler_js_1.UnauthorizedError());
            return;
        }
        const userLevel = CLEARANCE_ORDER.indexOf(req.user.clearanceLevel);
        const requiredLevel = CLEARANCE_ORDER.indexOf(minLevel);
        if (userLevel < requiredLevel) {
            next(new error_handler_js_1.ForbiddenError(`Requires ${minLevel} clearance`));
            return;
        }
        next();
    };
}
/**
 * Require specific compartment access
 */
function requireCompartment(compartment) {
    return (req, _res, next) => {
        if (!req.user) {
            next(new error_handler_js_1.UnauthorizedError());
            return;
        }
        if (!req.user.compartments.includes(compartment)) {
            next(new error_handler_js_1.ForbiddenError(`Requires ${compartment} compartment access`));
            return;
        }
        next();
    };
}
