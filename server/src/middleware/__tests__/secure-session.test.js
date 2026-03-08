"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
process.env.NODE_ENV = 'production';
process.env.CORS_ORIGIN = 'https://example.com';
process.env.DATABASE_URL = 'postgres://user:securepass@db.example.com:5432/db';
process.env.NEO4J_URI = 'bolt://neo4j.example.com:7687';
process.env.NEO4J_USER = 'neo4j';
process.env.NEO4J_PASSWORD = 'secure-neo4j-password-32chars-min';
process.env.JWT_SECRET = 'a'.repeat(40);
process.env.JWT_REFRESH_SECRET = 'b'.repeat(40);
process.env.RATE_LIMIT_WINDOW_MS = '60000';
process.env.RATE_LIMIT_MAX_REQUESTS = '100';
process.env.RATE_LIMIT_MAX_AUTHENTICATED = '1000';
process.env.AI_RATE_LIMIT_WINDOW_MS = '900000';
process.env.AI_RATE_LIMIT_MAX_REQUESTS = '50';
process.env.REDIS_PASSWORD = 'secure-redis-password-32chars-min';
const express_1 = __importDefault(require("express"));
const supertest_1 = __importDefault(require("supertest"));
const secure_session_js_1 = require("../secure-session.js");
const http_shield_js_1 = require("../../security/http-shield.js");
const NO_NETWORK_LISTEN = process.env.NO_NETWORK_LISTEN === 'true';
const describeIf = NO_NETWORK_LISTEN ? globals_1.describe.skip : globals_1.describe;
const buildApp = () => {
    const app = (0, express_1.default)();
    app.use(http_shield_js_1.cookieParserMiddleware);
    app.use(secure_session_js_1.secureSession);
    app.get('/session-check', (req, res) => {
        res.json({ sessionId: req.sessionId });
    });
    return app;
};
describeIf('secureSession middleware', () => {
    (0, globals_1.it)('sets a secure, httpOnly session cookie', async () => {
        const app = buildApp();
        const response = await (0, supertest_1.default)(app).get('/session-check');
        (0, globals_1.expect)(response.status).toBe(200);
        (0, globals_1.expect)(response.body.sessionId).toBeDefined();
        const setCookie = response.headers['set-cookie']?.[0];
        (0, globals_1.expect)(setCookie).toContain('ig.sid=');
        (0, globals_1.expect)(setCookie).toContain('HttpOnly');
        (0, globals_1.expect)(setCookie).toContain('Secure');
        (0, globals_1.expect)(setCookie).toContain('SameSite=Strict');
    });
    (0, globals_1.it)('reuses existing signed session cookies', async () => {
        const app = buildApp();
        const first = await (0, supertest_1.default)(app).get('/session-check');
        const cookie = first.headers['set-cookie'][0];
        const second = await (0, supertest_1.default)(app).get('/session-check').set('Cookie', cookie);
        (0, globals_1.expect)(first.body.sessionId).toBeDefined();
        (0, globals_1.expect)(second.body.sessionId).toBe(first.body.sessionId);
        (0, globals_1.expect)(second.headers['set-cookie']).toBeUndefined();
    });
});
