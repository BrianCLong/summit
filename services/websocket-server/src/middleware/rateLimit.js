"use strict";
/**
 * Rate Limiting Middleware using Token Bucket Algorithm
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRateLimitMiddleware = createRateLimitMiddleware;
exports.wrapHandlerWithRateLimit = wrapHandlerWithRateLimit;
const logger_js_1 = require("../utils/logger.js");
function createRateLimitMiddleware(rateLimiter) {
    return async (socket, next) => {
        const authSocket = socket;
        try {
            await rateLimiter.acquire(`connection:${authSocket.tenantId}:${authSocket.user.userId}`);
            next();
        }
        catch (error) {
            logger_js_1.logger.warn({
                tenantId: authSocket.tenantId,
                userId: authSocket.user.userId,
                error,
            }, 'Rate limit exceeded for connection');
            return next(new Error('Rate limit exceeded'));
        }
    };
}
function wrapHandlerWithRateLimit(socket, rateLimiter, handler) {
    return (...args) => {
        const key = `message:${socket.tenantId}:${socket.user.userId}`;
        if (rateLimiter.tryAcquireSync(key)) {
            handler(...args);
        }
        else {
            logger_js_1.logger.warn({ key }, 'Message dropped due to rate limit');
            socket.emit('system:error', {
                code: 'RATE_LIMIT_EXCEEDED',
                message: 'Too many messages, please slow down',
            });
        }
    };
}
