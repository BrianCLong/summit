"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const supertest_1 = __importDefault(require("supertest"));
const cors_options_js_1 = require("../cors-options.js");
const describeIf = process.env.NO_NETWORK_LISTEN === 'true' ? globals_1.describe.skip : globals_1.describe;
const createApp = (originConfig, nodeEnv) => {
    const corsOptions = (0, cors_options_js_1.buildCorsOptions)({
        CORS_ORIGIN: originConfig,
        NODE_ENV: nodeEnv,
    });
    const app = (0, express_1.default)();
    app.use((0, cors_1.default)(corsOptions));
    app.options(/.*/, (0, cors_1.default)(corsOptions));
    app.get('/ping', (_req, res) => res.json({ ok: true }));
    return app;
};
describeIf('buildCorsOptions', () => {
    (0, globals_1.it)('allows configured origins in production and sets headers', async () => {
        const app = createApp('https://allowed.example,https://cdn.allowed', 'production');
        const res = await (0, supertest_1.default)(app)
            .get('/ping')
            .set('Origin', 'https://allowed.example');
        (0, globals_1.expect)(res.status).toBe(200);
        (0, globals_1.expect)(res.headers['access-control-allow-origin']).toBe('https://allowed.example');
        (0, globals_1.expect)(res.headers['access-control-allow-credentials']).toBe('true');
    });
    (0, globals_1.it)('reflects preflight headers for telemetry requests', async () => {
        const app = createApp('https://ui.example', 'production');
        const res = await (0, supertest_1.default)(app)
            .options('/ping')
            .set('Origin', 'https://ui.example')
            .set('Access-Control-Request-Method', 'POST')
            .set('Access-Control-Request-Headers', 'x-tenant-id,content-type');
        (0, globals_1.expect)(res.status).toBe(204);
        (0, globals_1.expect)(res.headers['access-control-allow-headers']).toMatch(/x-tenant-id/i);
        (0, globals_1.expect)(res.headers['access-control-allow-origin']).toBe('https://ui.example');
    });
    (0, globals_1.it)('rejects unexpected origins in production', async () => {
        const app = createApp('https://allowed.example', 'production');
        const res = await (0, supertest_1.default)(app)
            .get('/ping')
            .set('Origin', 'https://malicious.example');
        (0, globals_1.expect)(res.status).toBe(500);
    });
});
