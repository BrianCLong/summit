"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.advancedRateLimiter = exports.RequestPriority = exports.RateLimitTier = void 0;
const globals_1 = require("@jest/globals");
exports.RateLimitTier = {
    FREE: 'free',
    BASIC: 'basic',
    PREMIUM: 'premium',
    ENTERPRISE: 'enterprise',
    INTERNAL: 'internal'
};
exports.RequestPriority = {
    LOW: 'low',
    NORMAL: 'normal',
    HIGH: 'high',
    CRITICAL: 'critical'
};
exports.advancedRateLimiter = {
    middleware: globals_1.jest.fn(() => (req, res, next) => {
        if (next)
            next();
    }),
    getStatus: globals_1.jest.fn().mockResolvedValue({ status: 'ok' }),
    isRateLimited: globals_1.jest.fn().mockResolvedValue(false),
    increment: globals_1.jest.fn().mockResolvedValue(undefined),
    reset: globals_1.jest.fn().mockResolvedValue(true),
};
exports.default = {
    advancedRateLimiter: exports.advancedRateLimiter,
    RateLimitTier: exports.RateLimitTier,
    RequestPriority: exports.RequestPriority
};
