"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const supertest_1 = __importDefault(require("supertest"));
const globals_1 = require("@jest/globals");
const health_js_1 = __importDefault(require("../../server/src/routes/health.js"));
const buildApp = () => {
    const app = (0, express_1.default)();
    app.use(health_js_1.default);
    return app;
};
(0, globals_1.describe)('standardized health endpoints', () => {
    const originalEnv = process.env.HEALTH_ENDPOINTS_ENABLED;
    const originalVersion = process.env.APP_VERSION;
    const originalCommit = process.env.GIT_COMMIT;
    (0, globals_1.beforeEach)(() => {
        process.env.HEALTH_ENDPOINTS_ENABLED = 'true';
        process.env.APP_VERSION = '1.2.3-test';
        process.env.GIT_COMMIT = 'abc123';
    });
    (0, globals_1.afterEach)(() => {
        process.env.HEALTH_ENDPOINTS_ENABLED = originalEnv;
        process.env.APP_VERSION = originalVersion;
        process.env.GIT_COMMIT = originalCommit;
    });
    (0, globals_1.it)('returns liveness details on /healthz', async () => {
        const app = buildApp();
        const response = await (0, supertest_1.default)(app).get('/healthz');
        (0, globals_1.expect)(response.status).toBe(200);
        (0, globals_1.expect)(response.body).toEqual(globals_1.expect.objectContaining({
            status: 'ok',
            environment: globals_1.expect.any(String),
            timestamp: globals_1.expect.any(String),
            uptime: globals_1.expect.any(Number),
        }));
    });
    (0, globals_1.it)('returns shallow readiness details on /readyz', async () => {
        const app = buildApp();
        const response = await (0, supertest_1.default)(app).get('/readyz');
        (0, globals_1.expect)(response.status).toBe(200);
        (0, globals_1.expect)(response.body).toEqual(globals_1.expect.objectContaining({
            status: 'ready',
            checks: {
                database: 'skipped',
                cache: 'skipped',
                messaging: 'skipped',
            },
            message: globals_1.expect.stringContaining('Shallow readiness probe'),
        }));
    });
    (0, globals_1.it)('returns service metadata on /status', async () => {
        const app = buildApp();
        const response = await (0, supertest_1.default)(app).get('/status');
        (0, globals_1.expect)(response.status).toBe(200);
        (0, globals_1.expect)(response.body).toEqual(globals_1.expect.objectContaining({
            status: 'ok',
            version: '1.2.3-test',
            commit: 'abc123',
            startedAt: globals_1.expect.any(String),
        }));
    });
    (0, globals_1.it)('returns disabled indicator when feature flag is off', async () => {
        process.env.HEALTH_ENDPOINTS_ENABLED = 'false';
        const app = buildApp();
        const response = await (0, supertest_1.default)(app).get('/healthz');
        (0, globals_1.expect)(response.status).toBe(404);
        (0, globals_1.expect)(response.body).toEqual(globals_1.expect.objectContaining({
            status: 'disabled',
            reason: globals_1.expect.stringContaining('HEALTH_ENDPOINTS_ENABLED'),
        }));
    });
});
