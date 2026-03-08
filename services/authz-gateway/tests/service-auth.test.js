"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const supertest_1 = __importDefault(require("supertest"));
const service_auth_1 = require("../src/service-auth");
function buildApp(allowedServices) {
    const app = (0, express_1.default)();
    app.use(express_1.default.json());
    app.post('/internal', (0, service_auth_1.requireServiceAuth)({
        audience: 'authz-gateway',
        allowedServices,
        requiredScopes: ['abac:decide'],
    }), (_req, res) => res.json({ ok: true }));
    return app;
}
describe('service auth middleware', () => {
    const allowed = ['api-gateway', 'maestro'];
    const app = buildApp(allowed);
    it('accepts a valid caller', async () => {
        const token = await (0, service_auth_1.issueServiceToken)({
            audience: 'authz-gateway',
            serviceId: 'api-gateway',
            scopes: ['abac:decide'],
        });
        const res = await (0, supertest_1.default)(app)
            .post('/internal')
            .set('x-service-token', token)
            .send({});
        expect(res.status).toBe(200);
        expect(res.body.ok).toBe(true);
    });
    it('rejects missing token', async () => {
        const res = await (0, supertest_1.default)(app).post('/internal');
        expect(res.status).toBe(401);
        expect(res.body.error).toBe('missing_service_token');
    });
    it('rejects unknown service', async () => {
        const token = await (0, service_auth_1.issueServiceToken)({
            audience: 'authz-gateway',
            serviceId: 'untrusted',
            scopes: ['abac:decide'],
        });
        const res = await (0, supertest_1.default)(app)
            .post('/internal')
            .set('x-service-token', token)
            .send({});
        expect(res.status).toBe(403);
        expect(res.body.error).toBe('invalid_service_token');
    });
    it('rejects expired token', async () => {
        const token = await (0, service_auth_1.issueServiceToken)({
            audience: 'authz-gateway',
            serviceId: 'api-gateway',
            scopes: ['abac:decide'],
            expiresInSeconds: -5,
        });
        const res = await (0, supertest_1.default)(app)
            .post('/internal')
            .set('x-service-token', token)
            .send({});
        expect(res.status).toBe(403);
        expect(res.body.error).toBe('invalid_service_token');
    });
    it('rejects missing scopes', async () => {
        const token = await (0, service_auth_1.issueServiceToken)({
            audience: 'authz-gateway',
            serviceId: 'api-gateway',
            scopes: ['auth:introspect'],
        });
        const res = await (0, supertest_1.default)(app)
            .post('/internal')
            .set('x-service-token', token)
            .send({});
        expect(res.status).toBe(403);
        expect(res.body.error).toBe('invalid_service_token');
    });
});
