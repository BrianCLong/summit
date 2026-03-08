"use strict";
/**
 * JWT Authentication Middleware for Socket.IO
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuthMiddleware = createAuthMiddleware;
exports.requirePermission = requirePermission;
exports.requireRole = requireRole;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const logger_js_1 = require("../utils/logger.js");
function createAuthMiddleware(config) {
    return async (socket, next) => {
        try {
            // Extract token from handshake
            const token = socket.handshake.auth?.token ||
                socket.handshake.headers?.authorization?.replace('Bearer ', '');
            if (!token) {
                logger_js_1.logger.warn({ socketId: socket.id }, 'Connection attempt without token');
                return next(new Error('Authentication token required'));
            }
            // Verify JWT
            const decoded = jsonwebtoken_1.default.verify(token, config.jwt.secret, {
                algorithms: [config.jwt.algorithm],
            });
            // Check expiration
            const now = Math.floor(Date.now() / 1000);
            if (decoded.exp && decoded.exp < now) {
                logger_js_1.logger.warn({ socketId: socket.id, exp: decoded.exp }, 'Connection attempt with expired token');
                return next(new Error('Token expired'));
            }
            // Attach user claims to socket data
            socket.data.user = decoded;
            socket.data.tenantId = decoded.tenantId || 'default';
            socket.data.connectionId = `${socket.data.tenantId}:${decoded.userId}:${socket.id}`;
            socket.data.connectedAt = Date.now();
            logger_js_1.logger.info({
                connectionId: socket.data.connectionId,
                userId: decoded.userId,
                tenantId: socket.data.tenantId,
            }, 'WebSocket authentication successful');
            next();
        }
        catch (error) {
            logger_js_1.logger.warn({ socketId: socket.id, error: error.message }, 'WebSocket authentication failed');
            if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
                return next(new Error('Invalid token'));
            }
            if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
                return next(new Error('Token expired'));
            }
            return next(new Error('Authentication failed'));
        }
    };
}
function requirePermission(permission) {
    return (socket, next) => {
        if (!socket.data.user?.permissions?.includes(permission)) {
            logger_js_1.logger.warn({
                connectionId: socket.data.connectionId,
                permission,
                userPermissions: socket.data.user?.permissions,
            }, 'Permission denied');
            return next(new Error(`Permission denied: ${permission}`));
        }
        next();
    };
}
function requireRole(role) {
    return (socket, next) => {
        if (!socket.data.user?.roles?.includes(role)) {
            logger_js_1.logger.warn({
                connectionId: socket.data.connectionId,
                role,
                userRoles: socket.data.user?.roles,
            }, 'Role required');
            return next(new Error(`Role required: ${role}`));
        }
        next();
    };
}
