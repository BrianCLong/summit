"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const express_1 = __importDefault(require("express"));
const supertest_1 = __importDefault(require("supertest"));
globals_1.jest.mock('../../config.js', () => ({
    cfg: {
        CORS_ORIGIN: 'https://allowed.test',
        NODE_ENV: 'test',
        RATE_LIMIT_WINDOW_MS: 1000,
        RATE_LIMIT_MAX_AUTHENTICATED: 50,
        RATE_LIMIT_MAX_REQUESTS: 25,
    },
}));
const http_shield_js_1 = require("../http-shield.js");
(0, globals_1.describe)('buildContentSecurityPolicy', () => {
    (0, globals_1.it)('aligns connect-src with configured CORS origins', async () => {
        const app = (0, express_1.default)();
        app.use((0, http_shield_js_1.buildContentSecurityPolicy)('https://allowed.test'));
        app.get('/csp', (_req, res) => res.send('ok'));
        const response = await (0, supertest_1.default)(app).get('/csp');
        const cspHeader = response.headers['content-security-policy'];
        (0, globals_1.expect)(cspHeader).toContain("default-src 'self'");
        (0, globals_1.expect)(cspHeader).toContain('connect-src');
        (0, globals_1.expect)(cspHeader).toContain('https://allowed.test');
    });
    (0, globals_1.it)('sets strict defensive headers', async () => {
        const app = (0, express_1.default)();
        app.use((0, http_shield_js_1.buildContentSecurityPolicy)());
        app.get('/csp', (_req, res) => res.send('ok'));
        const response = await (0, supertest_1.default)(app).get('/csp');
        (0, globals_1.expect)(response.headers['referrer-policy']).toBe('no-referrer');
        (0, globals_1.expect)(response.headers['x-frame-options']).toBe('DENY');
    });
});
