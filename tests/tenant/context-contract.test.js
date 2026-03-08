"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const supertest_1 = __importDefault(require("supertest"));
const tenantContext_js_1 = __importDefault(require("../../server/src/middleware/tenantContext.js"));
describe('Tenant contract enforcement', () => {
    const app = (0, express_1.default)();
    app.use(express_1.default.json());
    app.use((req, _res, next) => {
        req.user = { sub: 'tester', tenant_id: 'tenant-contract' };
        next();
    });
    app.use('/api', (0, tenantContext_js_1.default)());
    app.get('/api/contracts/:tenantId', (req, res) => {
        res.json({ tenant: req.tenantContext?.tenantId });
    });
    it('denies requests when tenant identifiers do not align', async () => {
        const response = await (0, supertest_1.default)(app)
            .get('/api/contracts/other-tenant')
            .set('x-tenant-id', 'tenant-contract');
        expect(response.status).toBe(409);
        expect(response.body.error).toBe('tenant_context_error');
    });
    it('allows matching tenant identifiers', async () => {
        const response = await (0, supertest_1.default)(app)
            .get('/api/contracts/tenant-contract')
            .set('x-tenant-id', 'tenant-contract');
        expect(response.status).toBe(200);
        expect(response.body.tenant).toBe('tenant-contract');
    });
});
