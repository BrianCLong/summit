"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const express_1 = __importDefault(require("express"));
const crypto_1 = __importDefault(require("crypto"));
const supertest_1 = __importDefault(require("supertest"));
const aiWebhook_js_1 = __importDefault(require("../../routes/aiWebhook.js"));
const rateLimit_js_1 = require("../rateLimit.js");
const rateLimit_js_2 = require("../../config/rateLimit.js");
globals_1.jest.mock('../../realtime/pubsub.js', () => ({
    pubsub: { publish: globals_1.jest.fn() },
}));
const SECRET = 'test-secret';
function buildApp() {
    process.env.ML_WEBHOOK_SECRET = SECRET;
    const app = (0, express_1.default)();
    app.use(express_1.default.json({
        verify: (req, _res, buf) => {
            req.rawBody = buf;
        },
    }));
    app.use((req, _res, next) => {
        req.db = {
            jobs: { update: globals_1.jest.fn().mockResolvedValue(undefined) },
            insights: { insert: globals_1.jest.fn().mockResolvedValue({ id: 'insight' }) },
            audit: { insert: globals_1.jest.fn().mockResolvedValue(undefined) },
        };
        next();
    });
    app.use(aiWebhook_js_1.default);
    return app;
}
function sign(body) {
    const raw = JSON.stringify(body);
    const sig = crypto_1.default.createHmac('sha256', SECRET).update(raw).digest('hex');
    return { raw, sig };
}
function enableRateLimit(config) {
    (0, rateLimit_js_2.setRateLimitConfig)({
        enabled: true,
        store: 'memory',
        groups: {
            default: { limit: 100, windowMs: 60_000 },
            webhookIngest: { limit: 2, windowMs: 1_000 },
        },
        ...config,
    });
    (0, rateLimit_js_1.resetRateLimitStore)();
}
const run = process.env.NO_NETWORK_LISTEN !== 'true';
const describeIf = run ? globals_1.describe : globals_1.describe.skip;
describeIf('AI webhook rate limiting', () => {
    (0, globals_1.beforeEach)(() => {
        enableRateLimit();
    });
    (0, globals_1.afterEach)(() => {
        (0, rateLimit_js_1.resetRateLimitStore)();
    });
    (0, globals_1.it)('allows traffic under the configured limit', async () => {
        const app = buildApp();
        const body = { job_id: 'job-1', kind: 'nlp_entities', results: [] };
        const { sig } = sign(body);
        const res = await (0, supertest_1.default)(app)
            .post('/ai/webhook')
            .set('X-IntelGraph-Signature', sig)
            .send(body);
        (0, globals_1.expect)(res.status).toBe(200);
        (0, globals_1.expect)(res.headers['x-ratelimit-limit']).toBe('2');
        (0, globals_1.expect)(res.body.ok).toBe(true);
    });
    (0, globals_1.it)('returns 429 with retry headers once the limit is exceeded', async () => {
        const app = buildApp();
        const body = { job_id: 'job-2', kind: 'nlp_entities', results: [] };
        const { sig } = sign(body);
        await (0, supertest_1.default)(app)
            .post('/ai/webhook')
            .set('X-IntelGraph-Signature', sig)
            .send(body);
        await (0, supertest_1.default)(app)
            .post('/ai/webhook')
            .set('X-IntelGraph-Signature', sig)
            .send(body);
        const blocked = await (0, supertest_1.default)(app)
            .post('/ai/webhook')
            .set('X-IntelGraph-Signature', sig)
            .send(body);
        (0, globals_1.expect)(blocked.status).toBe(429);
        (0, globals_1.expect)(blocked.headers['retry-after']).toBeDefined();
        (0, globals_1.expect)(blocked.body.code).toBe('RATE_LIMIT_EXCEEDED');
    });
    (0, globals_1.it)('honors the feature flag and skips limiting when disabled', async () => {
        (0, rateLimit_js_2.setRateLimitConfig)({
            enabled: false,
            store: 'memory',
            groups: {
                default: { limit: 1, windowMs: 1_000 },
                webhookIngest: { limit: 1, windowMs: 1_000 },
            },
        });
        (0, rateLimit_js_1.resetRateLimitStore)();
        const app = buildApp();
        const body = { job_id: 'job-3', kind: 'nlp_entities', results: [] };
        const { sig } = sign(body);
        const first = await (0, supertest_1.default)(app)
            .post('/ai/webhook')
            .set('X-IntelGraph-Signature', sig)
            .send(body);
        const second = await (0, supertest_1.default)(app)
            .post('/ai/webhook')
            .set('X-IntelGraph-Signature', sig)
            .send(body);
        (0, globals_1.expect)(first.status).toBe(200);
        (0, globals_1.expect)(second.status).toBe(200);
    });
});
