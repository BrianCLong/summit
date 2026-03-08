"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const express_1 = __importDefault(require("express"));
const supertest_1 = __importDefault(require("supertest"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const tenantContext_1 = require("../../src/middleware/tenantContext");
const auth_1 = require("../../src/lib/auth");
const describeIf = process.env.NO_NETWORK_LISTEN === 'true' ? globals_1.describe.skip : globals_1.describe;
describeIf('tenantContextMiddleware', () => {
    const buildApp = () => {
        const app = (0, express_1.default)();
        app.use((0, tenantContext_1.tenantContextMiddleware)());
        app.get('/test', (req, res) => {
            res.json({ tenantId: req.tenantId });
        });
        return app;
    };
    const signToken = (payload) => jsonwebtoken_1.default.sign(payload, auth_1.JWT_SECRET);
    (0, globals_1.it)('extracts tenant from JWT when header is absent', async () => {
        const app = buildApp();
        const token = signToken({ tenantId: 'tenant-a', sub: 'user-1' });
        const res = await (0, supertest_1.default)(app)
            .get('/test')
            .set('Authorization', `Bearer ${token}`)
            .expect(200);
        (0, globals_1.expect)(res.body.tenantId).toBe('tenant-a');
    });
    (0, globals_1.it)('rejects mismatched tenant between header and JWT claim', async () => {
        const app = buildApp();
        const token = signToken({ tenantId: 'tenant-b', sub: 'user-1' });
        const res = await (0, supertest_1.default)(app)
            .get('/test')
            .set('Authorization', `Bearer ${token}`)
            .set('x-tenant-id', 'tenant-a')
            .expect(403);
        (0, globals_1.expect)(res.body.error).toMatch(/Tenant context mismatch/);
    });
});
