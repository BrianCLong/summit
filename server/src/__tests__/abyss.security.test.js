"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const globals_1 = require("@jest/globals");
const abyss_js_1 = require("../../src/routes/abyss.js");
(0, globals_1.describe)('Abyss Protocol Security', () => {
    let app;
    const MOCK_SECRET_HEADER = 'test-secret-header-value';
    (0, globals_1.beforeAll)(() => {
        process.env.ABYSS_SECURITY_HEADER = MOCK_SECRET_HEADER;
        app = (0, express_1.default)();
        app.use(express_1.default.json());
        app.use('/api/abyss', abyss_js_1.abyssRouter);
    });
    (0, globals_1.afterAll)(() => {
        delete process.env.ABYSS_SECURITY_HEADER;
    });
    (0, globals_1.describe)('extremeAuth Middleware', () => {
        (0, globals_1.it)('should allow access with correct header', async () => {
            const res = await (0, supertest_1.default)(app)
                .get('/api/abyss/state')
                .set('x-abyss-authorization', MOCK_SECRET_HEADER);
            (0, globals_1.expect)(res.status).not.toBe(403);
            (0, globals_1.expect)(res.body).toHaveProperty('protocolId');
        });
        (0, globals_1.it)('should deny access with missing header', async () => {
            const res = await (0, supertest_1.default)(app)
                .get('/api/abyss/state');
            (0, globals_1.expect)(res.status).toBe(403);
            (0, globals_1.expect)(res.body).toHaveProperty('message', 'Forbidden: Unimaginable authorization is required.');
        });
        (0, globals_1.it)('should deny access with incorrect header', async () => {
            const res = await (0, supertest_1.default)(app)
                .get('/api/abyss/state')
                .set('x-abyss-authorization', 'wrong-value');
            (0, globals_1.expect)(res.status).toBe(403);
        });
        (0, globals_1.it)('should deny access when env var is not set (fail secure)', async () => {
            // Temporarily unset env var
            const originalEnv = process.env.ABYSS_SECURITY_HEADER;
            delete process.env.ABYSS_SECURITY_HEADER;
            const res = await (0, supertest_1.default)(app)
                .get('/api/abyss/state')
                .set('x-abyss-authorization', MOCK_SECRET_HEADER);
            (0, globals_1.expect)(res.status).toBe(403);
            // Restore env var
            process.env.ABYSS_SECURITY_HEADER = originalEnv;
        });
    });
});
