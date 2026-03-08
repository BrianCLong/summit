"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const app_1 = require("../../server/src/app");
const auth_1 = require("../../server/src/lib/auth");
describe('Tenant contract tests', () => {
    let app;
    beforeAll(async () => {
        app = await (0, app_1.createApp)();
    });
    const signToken = (tenantId) => jsonwebtoken_1.default.sign({ tenantId, sub: 'contract-user' }, auth_1.JWT_SECRET);
    it('denies access when header tenant differs from token tenant', async () => {
        const token = signToken('tenant-x');
        const res = await (0, supertest_1.default)(app)
            .get('/metrics') // protected by tenant middleware for API paths
            .set('authorization', `Bearer ${token}`)
            .set('x-tenant-id', 'tenant-y');
        expect(res.status).toBe(403);
        expect(res.body.error).toMatch(/Tenant context mismatch/);
    });
});
