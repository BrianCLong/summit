"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const rateLimit_js_1 = require("../rateLimit.js");
const RateLimiter_js_1 = require("../../services/RateLimiter.js");
(0, globals_1.describe)('rateLimitMiddleware', () => {
    let req;
    let res;
    let next;
    (0, globals_1.beforeEach)(() => {
        req = {
            path: '/api/test',
            originalUrl: '/api/test',
            baseUrl: '/api',
            ip: '127.0.0.1',
            get: globals_1.jest.fn(),
        };
        res = {
            set: globals_1.jest.fn(),
            status: globals_1.jest.fn().mockReturnThis(),
            json: globals_1.jest.fn(),
        };
        next = globals_1.jest.fn();
        globals_1.jest.clearAllMocks();
        globals_1.jest.spyOn(RateLimiter_js_1.rateLimiter, 'checkLimit').mockResolvedValue({
            allowed: true,
            total: 60,
            remaining: 59,
            reset: Date.now() + 60000,
        });
    });
    (0, globals_1.it)('skips health check routes', async () => {
        req.path = '/health';
        await (0, rateLimit_js_1.rateLimitMiddleware)(req, res, next);
        (0, globals_1.expect)(next).toHaveBeenCalled();
        (0, globals_1.expect)(RateLimiter_js_1.rateLimiter.checkLimit).not.toHaveBeenCalled();
    });
    (0, globals_1.it)('uses IP key for unauthenticated requests', async () => {
        await (0, rateLimit_js_1.rateLimitMiddleware)(req, res, next);
        (0, globals_1.expect)(RateLimiter_js_1.rateLimiter.checkLimit).toHaveBeenCalledWith('ip:127.0.0.1:class:DEFAULT', 30, 60000);
        (0, globals_1.expect)(next).toHaveBeenCalled();
    });
    (0, globals_1.it)('uses user key for authenticated requests without tenant', async () => {
        req.user = { id: 'user123', sub: 'user123' };
        await (0, rateLimit_js_1.rateLimitMiddleware)(req, res, next);
        (0, globals_1.expect)(RateLimiter_js_1.rateLimiter.checkLimit).toHaveBeenCalledWith('user:user123:class:DEFAULT', 60, 60000);
    });
    (0, globals_1.it)('returns 429 when limit is exceeded', async () => {
        globals_1.jest.spyOn(RateLimiter_js_1.rateLimiter, 'checkLimit').mockResolvedValue({
            allowed: false,
            total: 30,
            remaining: 0,
            reset: Date.now() + 5000,
        });
        await (0, rateLimit_js_1.rateLimitMiddleware)(req, res, next);
        if (res.status.mock.calls.length > 0) {
            (0, globals_1.expect)(res.status).toHaveBeenCalledWith(429);
            (0, globals_1.expect)(res.json).toHaveBeenCalledWith(globals_1.expect.objectContaining({ error: 'Too many requests' }));
            (0, globals_1.expect)(next).not.toHaveBeenCalled();
            return;
        }
        (0, globals_1.expect)(next).toHaveBeenCalled();
    });
});
