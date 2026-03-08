"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const index_1 = require("../src/index");
const observability_1 = require("../src/observability");
const service_auth_1 = require("../src/service-auth");
const session_1 = require("../src/session");
describe('break glass flow', () => {
    afterAll(async () => {
        await (0, observability_1.stopObservability)();
    });
    afterEach(() => {
        jest.useRealTimers();
        session_1.sessionManager.clear();
        delete process.env.BREAK_GLASS;
        delete process.env.SERVICE_AUTH_CALLERS;
        delete process.env.AUTHZ_DEMO_USERNAME;
        delete process.env.AUTHZ_DEMO_PASSWORD;
    });
    it('grants, uses, and expires elevated access', async () => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2024-01-01T00:00:00Z'));
        process.env.BREAK_GLASS = '1';
        process.env.SERVICE_AUTH_CALLERS = 'ops';
        process.env.AUTHZ_DEMO_USERNAME = 'alice';
        process.env.AUTHZ_DEMO_PASSWORD = 'password123';
        const app = await (0, index_1.createApp)();
        const loginRes = await (0, supertest_1.default)(app)
            .post('/auth/login')
            .send({ username: 'alice', password: 'password123' });
        expect(loginRes.status).toBe(200);
        const { session } = await session_1.sessionManager.validate(loginRes.body.token);
        const serviceToken = await (0, service_auth_1.issueServiceToken)({
            audience: 'authz-gateway',
            serviceId: 'ops',
            scopes: ['breakglass:manage'],
            expiresInSeconds: 60,
        });
        const grantRes = await (0, supertest_1.default)(app)
            .post('/admin/break-glass/grant')
            .set('x-service-token', serviceToken)
            .send({
            sid: session.sid,
            reason: 'auth outage',
            role: 'oncall-admin',
            requestedBy: 'pagerduty-oncall',
            durationSeconds: 5,
            approvals: [{ approver: 'security-duty', note: 'dual-approval' }],
        });
        expect(grantRes.status).toBe(200);
        const elevatedToken = grantRes.body.token;
        const verifyRes = await (0, supertest_1.default)(app)
            .get('/break-glass/verify')
            .set('Authorization', `Bearer ${elevatedToken}`);
        expect(verifyRes.status).toBe(200);
        expect(verifyRes.body.session.reason).toBe('auth outage');
        expect(verifyRes.body.session.approvals[0].approver).toBe('security-duty');
        jest.setSystemTime(new Date(Date.now() + 10_000));
        const expiredRes = await (0, supertest_1.default)(app)
            .get('/break-glass/verify')
            .set('Authorization', `Bearer ${elevatedToken}`);
        expect(expiredRes.status).toBe(401);
        expect(expiredRes.body.error).toBe('session_expired');
    });
});
