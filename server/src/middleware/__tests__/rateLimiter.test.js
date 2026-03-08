"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const express_1 = __importDefault(require("express"));
const supertest_1 = __importDefault(require("supertest"));
const rateLimiter_js_1 = require("../rateLimiter.js");
const app = (0, express_1.default)();
app.use('/public', rateLimiter_js_1.publicRateLimit, (req, res) => res.status(200).send('Public OK'));
app.use('/authenticated', (req, res, next) => {
    req.user = { id: 'test-user' };
    next();
}, rateLimiter_js_1.authenticatedRateLimit, (req, res) => res.status(200).send('Authenticated OK'));
const run = process.env.NO_NETWORK_LISTEN !== 'true';
const describeIf = run ? globals_1.describe : globals_1.describe.skip;
describeIf('Rate Limiting Middleware', () => {
    (0, globals_1.describe)('Public Rate Limiting', () => {
        (0, globals_1.it)('should allow requests under the limit', async () => {
            const response = await (0, supertest_1.default)(app).get('/public');
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.text).toBe('Public OK');
        });
        (0, globals_1.it)('should block requests over the limit', async () => {
            // Exceed the rate limit
            for (let i = 0; i < 101; i++) {
                await (0, supertest_1.default)(app).get('/public');
            }
            const response = await (0, supertest_1.default)(app).get('/public');
            (0, globals_1.expect)(response.status).toBe(429);
            (0, globals_1.expect)(response.body.error).toContain('Too many public requests');
        });
        (0, globals_1.it)('should set the correct rate limit headers', async () => {
            const response = await (0, supertest_1.default)(app).get('/public');
            (0, globals_1.expect)(response.headers['x-ratelimit-limit']).toBeDefined();
            (0, globals_1.expect)(response.headers['x-ratelimit-remaining']).toBeDefined();
            (0, globals_1.expect)(response.headers['x-ratelimit-reset']).toBeDefined();
        });
    });
    (0, globals_1.describe)('Authenticated Rate Limiting', () => {
        (0, globals_1.it)('should allow requests under the limit', async () => {
            const response = await (0, supertest_1.default)(app).get('/authenticated');
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.text).toBe('Authenticated OK');
        });
        (0, globals_1.it)('should block requests over the limit', async () => {
            // Exceed the rate limit
            for (let i = 0; i < 1001; i++) {
                await (0, supertest_1.default)(app).get('/authenticated');
            }
            const response = await (0, supertest_1.default)(app).get('/authenticated');
            (0, globals_1.expect)(response.status).toBe(429);
            (0, globals_1.expect)(response.body.error).toContain('Too many authenticated requests');
        });
        (0, globals_1.it)('should set the correct rate limit headers', async () => {
            const response = await (0, supertest_1.default)(app).get('/authenticated');
            (0, globals_1.expect)(response.headers['x-ratelimit-limit']).toBeDefined();
            (0, globals_1.expect)(response.headers['x-ratelimit-remaining']).toBeDefined();
            (0, globals_1.expect)(response.headers['x-ratelimit-reset']).toBeDefined();
        });
    });
});
