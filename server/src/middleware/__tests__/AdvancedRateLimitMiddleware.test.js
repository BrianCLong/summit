"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const TieredRateLimitMiddleware_js_1 = require("../TieredRateLimitMiddleware.js");
(0, globals_1.describe)('AdvancedRateLimiter', () => {
    let limiter;
    let req;
    let res;
    let next;
    (0, globals_1.beforeEach)(() => {
        limiter = new TieredRateLimitMiddleware_js_1.AdvancedRateLimiter({
            redis: { host: 'localhost', port: 6379 },
            enableTrafficShaping: false,
        });
        req = {
            headers: {},
            ip: '127.0.0.1',
            user: { id: 'u1', tier: TieredRateLimitMiddleware_js_1.RateLimitTier.FREE },
        };
        res = {
            set: globals_1.jest.fn(),
            status: globals_1.jest.fn().mockReturnThis(),
            json: globals_1.jest.fn(),
            on: globals_1.jest.fn(),
            locals: {},
        };
        next = globals_1.jest.fn();
    });
    (0, globals_1.test)('allows request and sets free tier header', async () => {
        const middleware = limiter.middleware();
        await middleware(req, res, next);
        (0, globals_1.expect)(next).toHaveBeenCalled();
        (0, globals_1.expect)(res.set).toHaveBeenCalledWith('X-RateLimit-Quota-Remaining', '100');
    });
    (0, globals_1.test)('identifies premium tier from user object', async () => {
        req.user.tier = TieredRateLimitMiddleware_js_1.RateLimitTier.PREMIUM;
        const middleware = limiter.middleware();
        await middleware(req, res, next);
        (0, globals_1.expect)(res.set).toHaveBeenCalledWith('X-RateLimit-Quota-Remaining', '10000');
    });
    (0, globals_1.test)('falls back to IP identity when user is absent', async () => {
        delete req.user;
        const middleware = limiter.middleware();
        await middleware(req, res, next);
        (0, globals_1.expect)(next).toHaveBeenCalled();
        (0, globals_1.expect)(res.set).toHaveBeenCalledWith('X-RateLimit-Quota-Remaining', '100');
    });
});
