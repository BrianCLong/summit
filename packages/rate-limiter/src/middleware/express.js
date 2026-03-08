"use strict";
/**
 * Express Rate Limit Middleware
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRateLimitMiddleware = createRateLimitMiddleware;
exports.createEndpointRateLimiter = createEndpointRateLimiter;
exports.createTierRateLimiter = createTierRateLimiter;
const pino_1 = __importDefault(require("pino"));
const logger = (0, pino_1.default)();
/**
 * Default key generator - uses user ID, tenant ID, or IP address
 */
function defaultKeyGenerator(req) {
    // Prioritize authenticated user
    if (req.user?.id) {
        return `user:${req.user.id}`;
    }
    // Fall back to tenant
    if (req.tenant?.id) {
        return `tenant:${req.tenant.id}`;
    }
    // Fall back to IP
    return `ip:${req.ip || req.socket.remoteAddress || 'unknown'}`;
}
/**
 * Default tier extractor
 */
function defaultTierExtractor(req) {
    // Check user tier
    if (req.user?.tier) {
        return req.user.tier;
    }
    // Check tenant tier
    if (req.tenant?.plan || req.tenant?.tier) {
        return (req.tenant.plan || req.tenant.tier);
    }
    return undefined;
}
/**
 * Set rate limit headers on response
 */
function setRateLimitHeaders(res, state) {
    res.setHeader('X-RateLimit-Limit', state.limit.toString());
    res.setHeader('X-RateLimit-Remaining', state.remaining.toString());
    res.setHeader('X-RateLimit-Reset', state.resetAt.toString());
    if (state.isExceeded && state.retryAfter > 0) {
        res.setHeader('Retry-After', state.retryAfter.toString());
    }
}
/**
 * Default handler for rate limit exceeded
 */
function defaultHandler(req, res, next, state) {
    setRateLimitHeaders(res, state);
    res.status(429).json({
        error: 'rate_limit_exceeded',
        message: 'Too many requests. Please try again later.',
        retryAfter: state.retryAfter,
        limit: state.limit,
        remaining: 0,
        resetAt: new Date(state.resetAt * 1000).toISOString(),
    });
}
/**
 * Create Express middleware for rate limiting
 */
function createRateLimitMiddleware(rateLimiter, options = {}) {
    const keyGenerator = options.keyGenerator || defaultKeyGenerator;
    const handler = options.handler || defaultHandler;
    const skip = options.skip;
    const includeHeaders = options.headers !== false;
    return async (req, res, next) => {
        try {
            // Check if should skip rate limiting
            if (skip && await skip(req)) {
                return next();
            }
            // Extract identifier and tier
            const identifier = await keyGenerator(req);
            const tier = defaultTierExtractor(req);
            const endpoint = req.path;
            // Check rate limit
            const state = await rateLimiter.check(identifier, endpoint, tier);
            // Set headers if enabled
            if (includeHeaders) {
                setRateLimitHeaders(res, state);
            }
            // Handle rate limit exceeded
            if (state.isExceeded) {
                return handler(req, res, next, state);
            }
            // Allow request
            next();
        }
        catch (error) {
            logger.error({
                message: 'Rate limit middleware error',
                path: req.path,
                error: error instanceof Error ? error.message : String(error),
            });
            // Fail open - allow request if rate limiting fails
            next();
        }
    };
}
/**
 * Create endpoint-specific rate limiter
 */
function createEndpointRateLimiter(rateLimiter, endpoint, options = {}) {
    return createRateLimitMiddleware(rateLimiter, {
        ...options,
        keyGenerator: async (req) => {
            const baseKey = options.keyGenerator
                ? await options.keyGenerator(req)
                : defaultKeyGenerator(req);
            return `${baseKey}:${endpoint}`;
        },
    });
}
/**
 * Create tier-based rate limiter
 */
function createTierRateLimiter(rateLimiter, requiredTier, options = {}) {
    return createRateLimitMiddleware(rateLimiter, {
        ...options,
        skip: async (req) => {
            const tier = defaultTierExtractor(req);
            if (!tier) {
                return false;
            }
            // If skip function provided, use it
            if (options.skip && await options.skip(req)) {
                return true;
            }
            // Check tier hierarchy
            const tierHierarchy = ['free', 'basic', 'premium', 'enterprise', 'internal'];
            const currentTierIndex = tierHierarchy.indexOf(tier);
            const requiredTierIndex = tierHierarchy.indexOf(requiredTier);
            // Skip if user has higher tier than required
            return currentTierIndex >= requiredTierIndex;
        },
    });
}
