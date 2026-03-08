"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const rbac_manager_js_1 = require("../../../packages/authentication/src/rbac/rbac-manager.js");
const app_js_1 = require("../src/app.js");
const PolicyDecisionStore_js_1 = require("../src/services/PolicyDecisionStore.js");
const policy_decisions_js_1 = require("../src/db/models/policy_decisions.js");
const EventPublisher_js_1 = require("../src/services/EventPublisher.js");
class AllowAllPolicyService {
    async simulate() {
        return {
            allow: true,
            reason: 'ok',
            obligations: [],
            redactions: [],
            raw: {},
        };
    }
}
class StubReceiptStore {
    receipts = new Map([['r1', { id: 'r1', payload: 'ok' }]]);
    async get(id) {
        return this.receipts.get(id);
    }
}
class StubReceiptVerifier {
    async verify(_receipt) {
        return true;
    }
}
class StubEventPublisher extends EventPublisher_js_1.EventPublisher {
    published = [];
    async publish(event) {
        this.published.push(event);
    }
}
describe('API authentication, tenant isolation, and RBAC', () => {
    const buildTestApp = () => {
        const rbacManager = new rbac_manager_js_1.RBACManager();
        const preflightStore = new PolicyDecisionStore_js_1.InMemoryPolicyDecisionStore();
        const executeEvents = new StubEventPublisher();
        preflightStore.upsertPreflight({
            id: 'pf-allowed',
            action: 'collect',
            input: { target: 'alpha' },
            expiresAt: new Date(Date.now() + 60_000).toISOString(),
            request: {
                subject: { id: 'user-1', roles: ['action_operator'], tenantId: 'tenant-a' },
                action: { name: 'collect' },
            },
        });
        return {
            rbacManager,
            app: (0, app_js_1.buildApp)({
                rbacManager,
                preflightStore,
                events: executeEvents,
                decisionStore: new policy_decisions_js_1.PolicyDecisionStore(() => new Date('2024-01-01T00:00:00Z')),
                policyService: new AllowAllPolicyService(),
                store: new StubReceiptStore(),
                verifier: new StubReceiptVerifier(),
            }),
            executeEvents,
            preflightStore,
        };
    };
    it('rejects unauthenticated requests', async () => {
        const { app } = buildTestApp();
        const response = await (0, supertest_1.default)(app).get('/epics');
        expect(response.status).toBe(401);
        expect(response.body.error).toBe('unauthorized');
    });
    it('rejects requests without tenant context', async () => {
        const { app } = buildTestApp();
        const response = await (0, supertest_1.default)(app)
            .get('/epics')
            .set('Authorization', 'Bearer token-123');
        expect(response.status).toBe(400);
        expect(response.body.error).toBe('tenant_context_required');
    });
    it('denies operations when role lacks permission', async () => {
        const { app } = buildTestApp();
        const response = await (0, supertest_1.default)(app)
            .post('/epics/epic-1/tasks/task-1/status')
            .set('Authorization', 'Bearer token-123')
            .set('X-Tenant-ID', 'tenant-a')
            .send({ status: 'in_progress' });
        expect(response.status).toBe(403);
        expect(response.body.error).toBe('forbidden');
    });
    it('enforces RBAC on privileged actions and succeeds when permitted', async () => {
        const { app } = buildTestApp();
        const preflightResponse = await (0, supertest_1.default)(app)
            .post('/actions/preflight')
            .set('Authorization', 'Bearer token-allowed')
            .set('X-Tenant-ID', 'tenant-a')
            .set('X-Roles', 'action_operator')
            .send({
            subject: { id: 'user-1', roles: ['action_operator'], tenantId: 'tenant-a' },
            action: { name: 'collect' },
        });
        expect(preflightResponse.status).toBe(200);
        expect(preflightResponse.body.decision).toBe('allow');
        const executeResponse = await (0, supertest_1.default)(app)
            .post('/actions/execute')
            .set('Authorization', 'Bearer token-allowed')
            .set('X-Tenant-ID', 'tenant-a')
            .set('X-Roles', 'action_operator')
            .send({ preflight_id: 'pf-allowed', action: 'collect', input: { target: 'alpha' } });
        expect(executeResponse.status).toBe(200);
        expect(executeResponse.body.status).toBe('accepted');
    });
    it('blocks cross-tenant access attempts', async () => {
        const { app } = buildTestApp();
        const response = await (0, supertest_1.default)(app)
            .get('/epics')
            .set('Authorization', 'Bearer token-tenant')
            .set('X-Actor-Tenant-ID', 'tenant-a')
            .set('X-Tenant-ID', 'tenant-b');
        expect(response.status).toBe(403);
        expect(response.body.error).toBe('tenant_access_denied');
    });
});
