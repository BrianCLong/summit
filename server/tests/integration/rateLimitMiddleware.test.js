"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const rateLimit_1 = require("../../src/middleware/rateLimit");
// Mock getRedisClient to return a fake Redis client
// This tests Middleware -> RateLimiter -> (Mock)Redis
const mockRedis = {
    eval: globals_1.jest.fn(),
    call: globals_1.jest.fn(),
};
globals_1.jest.mock('../../src/config/database.js', () => ({
    getRedisClient: () => mockRedis,
}));
// We need to unmock RateLimiter if it was automatically mocked by previous tests
globals_1.jest.unmock('../../src/services/RateLimiter');
(0, globals_1.describe)('Rate Limit Middleware Integration (with Redis Mock)', () => {
    let app;
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        app = (0, express_1.default)();
        app.use(express_1.default.json());
        // Mock auth middleware for some tests
        app.use((req, res, next) => {
            const userId = req.headers['x-user-id'];
            if (userId) {
                req.user = { id: userId, sub: userId };
            }
            next();
        });
        app.use(rateLimit_1.rateLimitMiddleware);
        app.get('/', (req, res) => res.send('ok'));
        app.get('/api/ai/test', (req, res) => res.send('ai ok'));
    });
    (0, globals_1.it)('should allow request when Redis returns low count', async () => {
        // Redis returns [current_count, ttl]
        mockRedis.eval.mockResolvedValue([1, 60000]);
        const res = await (0, supertest_1.default)(app).get('/');
        (0, globals_1.expect)(res.status).toBe(200);
        (0, globals_1.expect)(res.header['x-ratelimit-remaining']).toBeDefined();
        (0, globals_1.expect)(mockRedis.eval).toHaveBeenCalled();
    });
    (0, globals_1.it)('should block request when Redis returns count > limit', async () => {
        // Redis returns [current_count=1001, ttl=5000]
        // Default IP limit is 1000 in .env/config
        mockRedis.eval.mockResolvedValue([1001, 5000]);
        const res = await (0, supertest_1.default)(app).get('/');
        (0, globals_1.expect)(res.status).toBe(429);
        (0, globals_1.expect)(res.header['retry-after']).toBeDefined();
        (0, globals_1.expect)(Number(res.header['retry-after'])).toBeGreaterThan(0);
        (0, globals_1.expect)(res.body.error).toMatch(/Too many requests/);
    });
    (0, globals_1.it)('should prioritize authenticated user limits', async () => {
        // Authenticated limit is 1000
        // Redis returns 500
        mockRedis.eval.mockResolvedValue([500, 60000]);
        const res = await (0, supertest_1.default)(app)
            .get('/')
            .set('x-user-id', 'test-user-123');
        (0, globals_1.expect)(res.status).toBe(200);
        // Verify we used the user key
        (0, globals_1.expect)(mockRedis.eval).toHaveBeenCalledWith(globals_1.expect.anything(), // script
        1, // numKeys
        globals_1.expect.stringContaining('rate_limit:user:test-user-123'), globals_1.expect.any(Number) // windowMs
        );
    });
    (0, globals_1.it)('should apply stricter limits for AI endpoints', async () => {
        // AI limit is 1000 / 5 = 200
        // Redis returns 201
        mockRedis.eval.mockResolvedValue([201, 60000]);
        const res = await (0, supertest_1.default)(app).get('/api/ai/test');
        (0, globals_1.expect)(res.status).toBe(429);
        (0, globals_1.expect)(mockRedis.eval).toHaveBeenCalledWith(globals_1.expect.anything(), 1, globals_1.expect.stringMatching(/rate_limit:ip:.*:ai/), globals_1.expect.any(Number));
    });
    (0, globals_1.it)('should handle Redis failure gracefully (fail open)', async () => {
        mockRedis.eval.mockRejectedValue(new Error('Redis is down'));
        const res = await (0, supertest_1.default)(app).get('/');
        (0, globals_1.expect)(res.status).toBe(200);
    });
});
