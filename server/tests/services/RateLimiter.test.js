"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const RateLimiter_1 = require("../../src/services/RateLimiter");
// Mock deps
const mockRedis = {
    eval: globals_1.jest.fn(),
    call: globals_1.jest.fn(),
};
globals_1.jest.mock('../../src/config/database.js', () => ({
    getRedisClient: () => mockRedis,
}));
globals_1.jest.mock('../../src/utils/metrics.js', () => ({
    PrometheusMetrics: class MockMetrics {
        createCounter = globals_1.jest.fn();
        createGauge = globals_1.jest.fn();
        incrementCounter = globals_1.jest.fn();
        setGauge = globals_1.jest.fn();
    }
}));
(0, globals_1.describe)('RateLimiter', () => {
    let limiter;
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        limiter = new RateLimiter_1.RateLimiter();
    });
    (0, globals_1.it)('should allow request when limit not exceeded', async () => {
        // Mock Lua response: [current_count, ttl]
        mockRedis.eval.mockResolvedValue([1, 1000]);
        const result = await limiter.checkLimit('test-key', 10, 60000);
        (0, globals_1.expect)(result.allowed).toBe(true);
        (0, globals_1.expect)(result.remaining).toBe(9);
        (0, globals_1.expect)(mockRedis.eval).toHaveBeenCalledWith(globals_1.expect.stringContaining('local current'), 1, globals_1.expect.stringContaining('test-key'), 1, 60000);
    });
    (0, globals_1.it)('should block request when limit exceeded', async () => {
        mockRedis.eval.mockResolvedValue([11, 1000]);
        const result = await limiter.checkLimit('test-key', 10, 60000);
        (0, globals_1.expect)(result.allowed).toBe(false);
        (0, globals_1.expect)(result.remaining).toBe(0);
    });
    (0, globals_1.it)('should fail open (allow) when redis fails', async () => {
        mockRedis.eval.mockRejectedValue(new Error('Redis down'));
        const result = await limiter.checkLimit('test-key', 10, 60000);
        (0, globals_1.expect)(result.allowed).toBe(true);
        (0, globals_1.expect)(result.total).toBe(10);
    });
});
