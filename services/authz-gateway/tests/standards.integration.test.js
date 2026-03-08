"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const index_1 = require("../src/index");
const service_auth_1 = require("../src/service-auth");
const slo_1 = require("../src/slo");
describe('Standards and evidence endpoints', () => {
    beforeEach(() => {
        (0, slo_1.resetSloTracker)();
    });
    it('returns per-tenant SLO snapshots', async () => {
        slo_1.sloTracker.record('tenant-slo', '/protected', 0.12, 200);
        const token = await (0, service_auth_1.issueServiceToken)({
            audience: 'authz-gateway',
            serviceId: 'api-gateway',
            scopes: ['slo:read'],
        });
        const app = await (0, index_1.createApp)();
        const res = await (0, supertest_1.default)(app)
            .get('/slo/tenant-slo')
            .set('x-service-token', token)
            .expect(200);
        expect(res.body.tenantId).toBe('tenant-slo');
        expect(res.body.requestCount).toBeGreaterThanOrEqual(1);
    });
    it('emits incident evidence bundles with metrics snapshots', async () => {
        const token = await (0, service_auth_1.issueServiceToken)({
            audience: 'authz-gateway',
            serviceId: 'api-gateway',
            scopes: ['incident:evidence'],
        });
        const app = await (0, index_1.createApp)();
        const res = await (0, supertest_1.default)(app)
            .post('/incidents/evidence')
            .set('x-service-token', token)
            .set('x-tenant-id', 'tenant-incident')
            .send({});
        expect(res.status).toBe(200);
        expect(res.body.id).toBeDefined();
        expect(res.body.metrics).toBeDefined();
        expect(res.body.metricsSnapshot).toBeDefined();
    });
    it('exposes standards hooks and policy bundles', async () => {
        const standardsToken = await (0, service_auth_1.issueServiceToken)({
            audience: 'authz-gateway',
            serviceId: 'api-gateway',
            scopes: ['standards:read'],
        });
        const policyToken = await (0, service_auth_1.issueServiceToken)({
            audience: 'authz-gateway',
            serviceId: 'api-gateway',
            scopes: ['policy:export'],
        });
        const app = await (0, index_1.createApp)();
        const hooksRes = await (0, supertest_1.default)(app)
            .get('/standards/hooks')
            .set('x-service-token', standardsToken)
            .expect(200);
        expect(hooksRes.body.audit).toBeDefined();
        expect(hooksRes.body.policyBundle).toBeDefined();
        const policyRes = await (0, supertest_1.default)(app)
            .get('/policy/bundle')
            .set('x-service-token', policyToken)
            .expect(200);
        expect(policyRes.body.policies[0].contents).toBeDefined();
    });
});
