"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimitMiddleware = rateLimitMiddleware;
exports.sanitizeInput = sanitizeInput;
exports.securityHeaders = securityHeaders;
exports.requestId = requestId;
const pino_1 = __importDefault(require("pino"));
const logger = (0, pino_1.default)({ name: 'citizen-rate-limiter' });
/**
 * Simple in-memory rate limiter
 * For production, use Redis-backed rate limiting
 */
class RateLimiter {
    store = new Map();
    windowMs;
    maxRequests;
    constructor(windowMs = 60000, maxRequests = 100) {
        this.windowMs = windowMs;
        this.maxRequests = maxRequests;
        // Cleanup expired entries every minute
        setInterval(() => this.cleanup(), 60000);
    }
    isRateLimited(key) {
        const now = Date.now();
        const entry = this.store.get(key);
        if (!entry || now > entry.resetTime) {
            // New window
            this.store.set(key, { count: 1, resetTime: now + this.windowMs });
            return { limited: false, remaining: this.maxRequests - 1, resetTime: now + this.windowMs };
        }
        if (entry.count >= this.maxRequests) {
            return { limited: true, remaining: 0, resetTime: entry.resetTime };
        }
        entry.count++;
        return { limited: false, remaining: this.maxRequests - entry.count, resetTime: entry.resetTime };
    }
    cleanup() {
        const now = Date.now();
        for (const [key, entry] of this.store.entries()) {
            if (now > entry.resetTime) {
                this.store.delete(key);
            }
        }
    }
}
const rateLimiter = new RateLimiter(60000, 100); // 100 requests per minute
/**
 * Rate limiting middleware
 */
function rateLimitMiddleware(req, res, next) {
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const result = rateLimiter.isRateLimited(key);
    res.setHeader('X-RateLimit-Limit', '100');
    res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
    res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000).toString());
    if (result.limited) {
        logger.warn({ ip: key }, 'Rate limit exceeded');
        res.status(429).json({
            error: 'Too many requests',
            retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
        });
        return;
    }
    next();
}
/**
 * Input sanitization middleware
 */
function sanitizeInput(req, _res, next) {
    if (req.body && typeof req.body === 'object') {
        req.body = sanitizeObject(req.body);
    }
    next();
}
function sanitizeObject(obj) {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
            // Remove potential XSS vectors
            sanitized[key] = value
                .replace(/<[^>]*>/g, '') // Strip HTML tags
                .trim()
                .slice(0, 10000); // Limit string length
        }
        else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            sanitized[key] = sanitizeObject(value);
        }
        else if (Array.isArray(value)) {
            sanitized[key] = value.map((item) => typeof item === 'string'
                ? item.replace(/<[^>]*>/g, '').trim().slice(0, 10000)
                : typeof item === 'object' && item !== null
                    ? sanitizeObject(item)
                    : item);
        }
        else {
            sanitized[key] = value;
        }
    }
    return sanitized;
}
/**
 * Security headers middleware
 */
function securityHeaders(_req, res, next) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.removeHeader('X-Powered-By');
    next();
}
/**
 * Request ID middleware for tracing
 */
function requestId(req, res, next) {
    const id = req.headers['x-request-id'] || crypto.randomUUID();
    res.setHeader('X-Request-ID', id);
    req.requestId = id;
    next();
}
