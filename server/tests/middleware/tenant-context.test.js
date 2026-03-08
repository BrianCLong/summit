"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const express_1 = __importDefault(require("express"));
const supertest_1 = __importDefault(require("supertest"));
const tenantContext_js_1 = __importDefault(require("../../src/middleware/tenantContext.js"));
(0, globals_1.describe)('tenantContextMiddleware', () => {
    const buildApp = () => {
        const app = (0, express_1.default)();
        app.use(express_1.default.json());
        app.use((req, _res, next) => {
            req.user = { sub: 'user-1', tenant_id: 'tenant-a', roles: ['analyst'] };
            next();
        });
        app.use((0, tenantContext_js_1.default)());
        app.get('/api/resources/:tenantId', (req, res) => {
            res.json({
                tenantContext: req.tenantContext,
            });
        });
        return app;
    };
    (0, globals_1.it)('resolves tenant from JWT claim and route parameter', async () => {
        const app = buildApp();
        const response = await (0, supertest_1.default)(app)
            .get('/api/resources/tenant-a')
            .set('x-tenant-id', 'tenant-a');
        (0, globals_1.expect)(response.status).toBe(200);
        (0, globals_1.expect)(response.body.tenantContext.tenantId).toBe('tenant-a');
        (0, globals_1.expect)(response.headers['x-tenant-id']).toBe('tenant-a');
    });
    (0, globals_1.it)('rejects mismatched tenant identifiers', async () => {
        const app = buildApp();
        const response = await (0, supertest_1.default)(app)
            .get('/api/resources/tenant-b')
            .set('x-tenant-id', 'tenant-a');
        (0, globals_1.expect)(response.status).toBe(409);
        (0, globals_1.expect)(response.body.error).toBe('tenant_context_error');
    });
});
