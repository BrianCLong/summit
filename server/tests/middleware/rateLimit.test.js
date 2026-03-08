"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rateLimit_js_1 = require("../../src/middleware/rateLimit.js");
const RateLimiter_js_1 = require("../../src/services/RateLimiter.js");
const quota_manager_js_1 = require("../../src/lib/resources/quota-manager.js");
const globals_1 = require("@jest/globals");
// Mock dependencies
globals_1.jest.mock('../../src/services/RateLimiter.js');
globals_1.jest.mock('../../src/lib/resources/quota-manager.js');
describe('rateLimitMiddleware', () => {
    let req;
    let res;
    let next;
    beforeEach(() => {
        req = {
            path: '/api/test',
            originalUrl: '/api/test',
            ip: '127.0.0.1',
            headers: {},
        };
        res = {
            set: globals_1.jest.fn(),
            status: globals_1.jest.fn().mockReturnThis(),
            json: globals_1.jest.fn(),
        };
        next = globals_1.jest.fn();
        // Reset mocks
        RateLimiter_js_1.rateLimiter.checkLimit.mockReturnValue(Promise.resolve({
            allowed: true,
            total: 100,
            remaining: 99,
            reset: Date.now() + 60000,
        }));
    });
    it('should apply tenant quota for authenticated users with tenantId', async () => {
        // Setup authenticated user with tenantId
        req.user = {
            id: 'user1',
            tenantId: 'TENANT_ALPHA',
        };
        // Mock QuotaManager
        quota_manager_js_1.quotaManager.getRateLimitConfig.mockReturnValue({
            limit: 12000,
            windowMs: 60000,
        });
        await (0, rateLimit_js_1.rateLimitMiddleware)(req, res, next);
        expect(quota_manager_js_1.quotaManager.getRateLimitConfig).toHaveBeenCalledWith('TENANT_ALPHA');
        expect(RateLimiter_js_1.rateLimiter.checkLimit).toHaveBeenCalledWith(expect.stringContaining('user:user1'), 12000, 60000);
        expect(next).toHaveBeenCalled();
    });
    it('should fall back to default authenticated limit if no tenantId', async () => {
        req.user = {
            id: 'user2',
        };
        await (0, rateLimit_js_1.rateLimitMiddleware)(req, res, next);
        expect(quota_manager_js_1.quotaManager.getRateLimitConfig).not.toHaveBeenCalled();
        // Assuming cfg.RATE_LIMIT_MAX_AUTHENTICATED is default (1000)
        expect(RateLimiter_js_1.rateLimiter.checkLimit).toHaveBeenCalledWith(expect.stringContaining('user:user2'), expect.any(Number), expect.any(Number));
    });
    it('should block requests when limit exceeded', async () => {
        RateLimiter_js_1.rateLimiter.checkLimit.mockReturnValue(Promise.resolve({
            allowed: false,
            total: 100,
            remaining: 0,
            reset: Date.now() + 10000,
        }));
        await (0, rateLimit_js_1.rateLimitMiddleware)(req, res, next);
        expect(res.status).toHaveBeenCalledWith(429);
        expect(next).not.toHaveBeenCalled();
    });
});
