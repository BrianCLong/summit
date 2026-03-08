"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const index_1 = require("../src/index");
const observability_1 = require("../src/observability");
const audit_1 = require("../src/audit");
describe('policy routes', () => {
    afterAll(async () => {
        await (0, observability_1.stopObservability)();
    });
    beforeEach(() => {
        (0, audit_1.resetAuditLog)();
    });
    it('simulates a policy decision via dry-run', async () => {
        const app = await (0, index_1.createApp)();
        const res = await (0, supertest_1.default)(app)
            .post('/policy/dry-run')
            .send({
            user: {
                sub: 'carol',
                tenantId: 'tenantA',
                roles: ['compliance'],
                clearance: 'confidential',
                status: 'active',
            },
            resource: { path: '/protected/investigation', tenantId: 'tenantB' },
            action: 'read',
            purpose: 'investigation',
            authority: 'fraud-investigation',
            record: { subject: { name: 'Carol White', ssn: '111-22-3333' } },
        });
        expect(res.status).toBe(200);
        expect(res.body.policyId).toBe('policy.compliance-override');
        expect(res.body.fields['subject.ssn']).toEqual({
            before: '111-22-3333',
            after: '[REDACTED]',
            effect: 'redact',
        });
    });
    it('returns stored audit decision by id', async () => {
        const app = await (0, index_1.createApp)();
        const loginRes = await (0, supertest_1.default)(app)
            .post('/auth/login')
            .send({ username: 'alice', password: 'password123' });
        const token = loginRes.body.token;
        const denied = await (0, supertest_1.default)(app)
            .get('/protected/resource')
            .set('Authorization', `Bearer ${token}`)
            .set('x-tenant-id', 'tenantB')
            .set('x-purpose', 'treatment')
            .set('x-authority', 'hipaa');
        const auditId = denied.headers['x-audit-id'];
        const auditRes = await (0, supertest_1.default)(app).get(`/audit/${auditId}`);
        expect(auditRes.status).toBe(200);
        expect(auditRes.body.id).toBe(auditId);
        expect(auditRes.body.decision.policyId).toBe('policy.tenant-isolation');
    });
});
