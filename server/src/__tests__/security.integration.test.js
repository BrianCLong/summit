"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_mongo_sanitize_1 = __importDefault(require("express-mongo-sanitize"));
const hpp_1 = __importDefault(require("hpp"));
const supertest_1 = __importDefault(require("supertest"));
const express_validation_pipeline_js_1 = require("../middleware/express-validation-pipeline.js");
const redisRateLimiter_js_1 = require("../middleware/redisRateLimiter.js");
const htmlSanitizer_js_1 = require("../utils/htmlSanitizer.js");
(0, globals_1.describe)('Security middleware integration', () => {
    const allowedOrigins = ['http://allowed.test'];
    const buildApp = () => {
        const app = (0, express_1.default)();
        app.use((0, helmet_1.default)({ contentSecurityPolicy: false }));
        app.use((req, res, next) => (0, cors_1.default)({
            origin: (origin, callback) => {
                if (!origin)
                    return callback(null, true);
                return allowedOrigins.includes(origin)
                    ? callback(null, true)
                    : callback(new Error('Origin not allowed'));
            },
            credentials: true,
        })(req, res, (err) => {
            if (err)
                return res.status(403).json({ error: err.message });
            next();
        }));
        app.use((0, hpp_1.default)());
        app.use(express_1.default.json());
        app.use((0, express_mongo_sanitize_1.default)({ replaceWith: '_' }));
        app.use(express_validation_pipeline_js_1.expressValidationPipeline);
        app.get('/echo', (req, res) => {
            res.json({ headers: req.headers, query: req.query, body: req.body });
        });
        app.post('/echo', (req, res) => {
            res.json({ headers: req.headers, query: req.query, body: req.body });
        });
        app.use('/limited', (0, redisRateLimiter_js_1.createRedisRateLimiter)({ windowMs: 50, max: 2, message: { error: 'limited' } }), (_req, res) => res.json({ ok: true }));
        return app;
    };
    (0, globals_1.it)('sets security headers via helmet', async () => {
        const response = await (0, supertest_1.default)(buildApp()).get('/echo');
        (0, globals_1.expect)(response.headers['x-dns-prefetch-control']).toBe('off');
    });
    (0, globals_1.it)('allows only whitelisted origins', async () => {
        const app = buildApp();
        const allowed = await (0, supertest_1.default)(app).get('/echo').set('Origin', allowedOrigins[0]);
        (0, globals_1.expect)(allowed.headers['access-control-allow-origin']).toBe(allowedOrigins[0]);
        const blocked = await (0, supertest_1.default)(app).get('/echo').set('Origin', 'http://evil.test');
        (0, globals_1.expect)(blocked.status).toBe(403);
        (0, globals_1.expect)(blocked.body.error).toContain('not allowed');
    });
    (0, globals_1.it)('sanitizes Mongo-style operators from payloads', async () => {
        const response = await (0, supertest_1.default)(buildApp())
            .post('/echo')
            .send({ name: 'safe', $where: 'malicious()' });
        (0, globals_1.expect)(response.body.body).toEqual({ name: 'safe' });
    });
    (0, globals_1.it)('collapses duplicated query params via hpp', async () => {
        const response = await (0, supertest_1.default)(buildApp()).get('/echo?role=admin&role=user');
        (0, globals_1.expect)(response.body.query.role).toBe('admin');
    });
    (0, globals_1.it)('sanitizes HTML using DOMPurify through express-validator pipeline', async () => {
        const dirty = "<img src=x onerror=alert('xss')>Hello";
        const response = await (0, supertest_1.default)(buildApp()).post('/echo').send({ bio: dirty });
        (0, globals_1.expect)(response.body.body.bio).toBe('Hello');
        (0, globals_1.expect)((0, htmlSanitizer_js_1.sanitizeHtml)(dirty)).toBe('Hello');
    });
    (0, globals_1.it)('enforces Redis-backed rate limits', async () => {
        const app = buildApp();
        await (0, supertest_1.default)(app).get('/limited');
        await (0, supertest_1.default)(app).get('/limited');
        const limited = await (0, supertest_1.default)(app).get('/limited');
        (0, globals_1.expect)(limited.status).toBe(429);
        (0, globals_1.expect)(limited.body.error).toBe('limited');
    });
});
