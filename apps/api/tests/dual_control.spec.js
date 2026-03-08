"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
jest.mock('../../../services/authz-gateway/src/observability', () => ({
    startObservability: jest.fn(),
    metricsHandler: (_req, res, next) => typeof next === 'function' ? next() : res?.status?.(200)?.end(),
    requestMetricsMiddleware: (_req, _res, next) => next(),
    tracingContextMiddleware: (_req, _res, next) => next(),
    injectTraceContext: jest.fn(),
    stopObservability: jest.fn(),
}));
const express_1 = __importDefault(require("express"));
const supertest_1 = __importDefault(require("supertest"));
const policy_1 = require("../../../services/authz-gateway/src/policy");
const attribute_service_1 = require("../../../services/authz-gateway/src/attribute-service");
const approvals_1 = require("../../../services/authz-gateway/src/db/models/approvals");
const index_1 = require("../../../services/authz-gateway/src/index");
const middleware_1 = require("../../../services/authz-gateway/src/middleware");
const observability_1 = require("../../../services/authz-gateway/src/observability");
const service_auth_1 = require("../../../services/authz-gateway/src/service-auth");
const data_json_1 = __importDefault(require("../../../policy/abac/data.json"));
const attributeService = new attribute_service_1.AttributeService({ ttlMs: 0 });
function clearanceRank(level) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data_json_1.default.clearance_rank[level] ?? -1;
}
function simulateDecision(input) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const actionConfig = data_json_1.default.actions[input.action] || {};
    const tenantMatch = input.subject.tenantId === input.resource.tenantId;
    const residencyMatrix = 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data_json_1.default.residency_matrix[input.subject.residency] ||
        [];
    const residencyAllowed = residencyMatrix.includes(input.resource.residency);
    const clearanceOk = clearanceRank(input.subject.clearance) >=
        clearanceRank(input.resource.classification);
    const hasRole = !actionConfig.allowedRoles ||
        actionConfig.allowedRoles.length === 0 ||
        actionConfig.allowedRoles.some((role) => input.subject.roles.includes(role));
    const allow = tenantMatch && residencyAllowed && clearanceOk && hasRole;
    const obligations = [];
    if (actionConfig.requiresStepUp && input.context.currentAcr !== 'loa2') {
        obligations.push({
            type: 'step_up',
            mechanism: 'webauthn',
            required_acr: 'loa2',
        });
    }
    if (actionConfig.dualControl?.required) {
        obligations.push({
            type: 'dual_control',
            approvals_required: actionConfig.dualControl.approvalsRequired,
            approver_roles: actionConfig.dualControl.approverRoles,
            require_distinct: actionConfig.dualControl.requireDistinctApprovers,
            attributes: {
                match_residency: actionConfig.dualControl.attributes?.matchResidency,
                min_clearance: actionConfig.dualControl.attributes?.minClearance,
                resource_residency: input.resource.residency,
                resource_classification: input.resource.classification,
            },
        });
    }
    return {
        allow,
        reason: allow ? 'allow' : 'policy_denied',
        obligations,
    };
}
let opaServer;
beforeAll((done) => {
    const opa = (0, express_1.default)();
    opa.use(express_1.default.json());
    opa.post('/v1/data/summit/abac/decision', (req, res) => res.json({ result: simulateDecision(req.body.input) }));
    opaServer = opa.listen(0, () => {
        const port = opaServer.address().port;
        process.env.OPA_URL = `http://localhost:${port}/v1/data/summit/abac/decision`;
        done();
    });
});
afterAll(async () => {
    opaServer?.close();
    await (0, observability_1.stopObservability)();
});
beforeEach(() => {
    approvals_1.approvalsStore.reset();
});
describe('dual control policy + execution', () => {
    it('surfaces dual-control obligations for sensitive actions', async () => {
        const subject = await attributeService.getSubjectAttributes('carol');
        const resource = await attributeService.getResourceAttributes('dataset-gamma');
        const decision = await (0, policy_1.authorize)({
            subject,
            resource,
            action: 'dataset:delete',
            context: attributeService.getDecisionContext('loa1'),
        });
        expect(decision.allowed).toBe(true);
        const obligation = decision.obligations.find((o) => o.type === 'dual_control');
        expect(obligation).toBeDefined();
        expect(obligation?.approvals_required).toBe(2);
        expect(obligation?.approver_roles).toEqual(expect.arrayContaining(['admin']));
    });
    it('blocks execution until dual-control approvals are satisfied', async () => {
        const app = await (0, index_1.createApp)();
        const localAttributeService = new attribute_service_1.AttributeService({ ttlMs: 0 });
        app.get('/sensitive/delete', (0, middleware_1.requireAuth)(localAttributeService, {
            action: 'dataset:delete',
            resourceIdHeader: 'x-resource-id',
        }), (_req, res) => res.json({ ok: true }));
        const loginRes = await (0, supertest_1.default)(app)
            .post('/auth/login')
            .send({ username: 'carol', password: 'password123' });
        const token = loginRes.body.token;
        const firstAttempt = await (0, supertest_1.default)(app)
            .get('/sensitive/delete')
            .set('Authorization', `Bearer ${token}`)
            .set('x-resource-id', 'dataset-gamma');
        expect(firstAttempt.status).toBe(403);
        expect(firstAttempt.body.error).toBe('dual_control_required');
        expect(firstAttempt.body.missing).toBeGreaterThan(0);
        const serviceToken = await (0, service_auth_1.issueServiceToken)({
            audience: 'authz-gateway',
            serviceId: 'api-gateway',
            scopes: ['approvals:write'],
            expiresInSeconds: 300,
        });
        for (const approverId of ['dave', 'erin']) {
            await (0, supertest_1.default)(app)
                .post('/approvals')
                .set('x-service-token', serviceToken)
                .send({
                action: 'dataset:delete',
                resourceId: 'dataset-gamma',
                requesterId: 'carol',
                approverId,
                decision: 'approved',
            })
                .expect(200);
        }
        const allowed = await (0, supertest_1.default)(app)
            .get('/sensitive/delete')
            .set('Authorization', `Bearer ${token}`)
            .set('x-resource-id', 'dataset-gamma');
        expect(allowed.status).toBe(200);
        expect(allowed.body.ok).toBe(true);
    });
});
