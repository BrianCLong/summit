"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.quotaManager = exports.EndpointClass = exports.createRouteRateLimitMiddleware = exports.resetRateLimitStore = exports.createRateLimiter = exports.rateLimitMiddleware = exports.rateLimit = void 0;
const rateLimit_js_1 = require("../../src/config/rateLimit.js");
const inMemoryStore = new Map();
const rateLimit = () => (_req, _res, next) => next();
exports.rateLimit = rateLimit;
const rateLimitMiddleware = (_req, _res, next) => next();
exports.rateLimitMiddleware = rateLimitMiddleware;
const createRateLimiter = () => exports.rateLimitMiddleware;
exports.createRateLimiter = createRateLimiter;
const resetRateLimitStore = () => {
    inMemoryStore.clear();
};
exports.resetRateLimitStore = resetRateLimitStore;
const createRouteRateLimitMiddleware = (group) => {
    return (req, res, next) => {
        const config = (0, rateLimit_js_1.getRateLimitConfig)();
        if (!config.enabled) {
            return next();
        }
        const groupConfig = config.groups[group] || config.groups.default;
        const key = `${req.ip || req.socket?.remoteAddress || 'unknown'}:${group}`;
        const now = Date.now();
        const existing = inMemoryStore.get(key);
        let entry = existing;
        if (!entry || entry.resetAt <= now) {
            entry = { count: 0, resetAt: now + groupConfig.windowMs };
            inMemoryStore.set(key, entry);
        }
        entry.count += 1;
        const remaining = groupConfig.limit - entry.count;
        const allowed = entry.count <= groupConfig.limit;
        res.setHeader('X-RateLimit-Limit', String(groupConfig.limit));
        res.setHeader('X-RateLimit-Remaining', String(Math.max(remaining, 0)));
        res.setHeader('X-RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));
        if (!allowed) {
            const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
            res.setHeader('Retry-After', String(retryAfter));
            return res.status(429).json({
                error: 'rate_limit_exceeded',
                code: 'RATE_LIMIT_EXCEEDED',
                retryAfter,
            });
        }
        return next();
    };
};
exports.createRouteRateLimitMiddleware = createRouteRateLimitMiddleware;
var EndpointClass;
(function (EndpointClass) {
    EndpointClass["AUTH"] = "AUTH";
    EndpointClass["EXPORT"] = "EXPORT";
    EndpointClass["INGEST"] = "INGEST";
    EndpointClass["QUERY"] = "QUERY";
    EndpointClass["AI"] = "AI";
    EndpointClass["DEFAULT"] = "DEFAULT";
})(EndpointClass || (exports.EndpointClass = EndpointClass = {}));
exports.quotaManager = {
    checkQuota: async () => ({ allowed: true }),
    recordUsage: async () => { },
};
exports.default = {
    rateLimit: exports.rateLimit,
    rateLimitMiddleware: exports.rateLimitMiddleware,
    createRateLimiter: exports.createRateLimiter,
    createRouteRateLimitMiddleware: exports.createRouteRateLimitMiddleware,
    resetRateLimitStore: exports.resetRateLimitStore,
    EndpointClass,
    quotaManager: exports.quotaManager,
};
