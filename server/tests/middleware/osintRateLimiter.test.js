"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const osintRateLimiter_1 = require("../../src/middleware/osintRateLimiter");
function createMockResponse() {
    const res = {
        statusCode: 200,
        headers: {},
        body: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        setHeader(name, value) {
            this.headers[name.toLowerCase()] = value;
            return this;
        },
        json(payload) {
            this.body = payload;
            return this;
        },
    };
    return res;
}
(0, globals_1.describe)('OSINT rate limiter', () => {
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.useFakeTimers();
        globals_1.jest.setSystemTime(0);
    });
    (0, globals_1.afterEach)(() => {
        globals_1.jest.useRealTimers();
    });
    (0, globals_1.it)('limits requests per user with sliding window semantics', async () => {
        const middleware = (0, osintRateLimiter_1.createOsintRateLimiter)({ userLimit: 2, ipLimit: 10, windowMs: 1000, redisClient: null });
        const next = globals_1.jest.fn();
        const request = { ip: '1.1.1.1', user: { id: 'user-1' } };
        await middleware(request, createMockResponse(), next);
        await middleware(request, createMockResponse(), next);
        const response = createMockResponse();
        await middleware(request, response, next);
        (0, globals_1.expect)(response.statusCode).toBe(429);
        (0, globals_1.expect)(response.body.scope).toBe('user');
        (0, globals_1.expect)(response.headers['retry-after']).toBeDefined();
        (0, globals_1.expect)(next).toHaveBeenCalledTimes(2);
    });
    (0, globals_1.it)('limits requests per IP when multiple users share an address', async () => {
        const middleware = (0, osintRateLimiter_1.createOsintRateLimiter)({ userLimit: 10, ipLimit: 2, windowMs: 1000, redisClient: null });
        const next = globals_1.jest.fn();
        const baseRequest = { ip: '2.2.2.2' };
        await middleware({ ...baseRequest, user: { id: 'user-a' } }, createMockResponse(), next);
        await middleware({ ...baseRequest, user: { id: 'user-b' } }, createMockResponse(), next);
        const response = createMockResponse();
        await middleware({ ...baseRequest, user: { id: 'user-c' } }, response, next);
        (0, globals_1.expect)(response.statusCode).toBe(429);
        (0, globals_1.expect)(response.body.scope).toBe('ip');
        (0, globals_1.expect)(response.body.retryAfterSeconds).toBeGreaterThan(0);
        (0, globals_1.expect)(next).toHaveBeenCalledTimes(2);
    });
});
