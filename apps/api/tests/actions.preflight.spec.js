"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const supertest_1 = __importDefault(require("supertest"));
const policy_decisions_js_1 = require("../src/db/models/policy_decisions.js");
const preflight_js_1 = require("../src/routes/actions/preflight.js");
class FakePolicyService {
    response;
    lastInput;
    constructor(response) {
        this.response = response;
    }
    async simulate(input) {
        this.lastInput = input;
        return this.response;
    }
}
describe('POST /actions/preflight', () => {
    const baseInput = {
        subject: { id: 'user-1', roles: ['analyst'], tenantId: 'acme' },
        action: { name: 'export', scope: 'case', attributes: {} },
        resource: { id: 'case-123', type: 'case', classification: 'restricted' },
        context: { requestId: 'req-1', ip: '127.0.0.1' }
    };
    function buildApp(policyService, store) {
        const app = (0, express_1.default)();
        app.use(express_1.default.json());
        app.use('/actions', (0, preflight_js_1.createPreflightRouter)({ policyService, decisionStore: store }));
        return app;
    }
    it('returns normalized decision payload and persists the record', async () => {
        const decision = {
            allow: true,
            reason: 'permit',
            obligations: [
                { code: 'audit', message: 'log export' },
                { code: 'redact', message: 'remove pii', targets: ['ssn'] }
            ],
            redactions: ['account_number'],
            raw: { result: { allow: true } }
        };
        const store = new policy_decisions_js_1.PolicyDecisionStore(() => new Date('2024-01-01T00:00:00Z'));
        const policyService = new FakePolicyService(decision);
        const app = buildApp(policyService, store);
        const response = await (0, supertest_1.default)(app)
            .post('/actions/preflight')
            .send(baseInput)
            .expect(200);
        expect(response.body).toMatchObject({
            decisionId: expect.any(String),
            decision: 'allow',
            reason: 'permit',
            obligations: decision.obligations,
            redactions: ['account_number', 'ssn']
        });
        expect(policyService.lastInput).toEqual(baseInput);
        const records = await store.all();
        expect(records).toHaveLength(1);
        const stored = records[0];
        expect(stored.createdAt).toBe('2024-01-01T00:00:00.000Z');
        expect(stored.allow).toBe(true);
        expect(stored.request).toEqual(baseInput);
        expect(stored.redactions).toEqual(['account_number', 'ssn']);
    });
    it('handles missing required fields with a validation error', async () => {
        const policyService = new FakePolicyService({
            allow: false,
            obligations: [],
            redactions: [],
            raw: {}
        });
        const store = new policy_decisions_js_1.PolicyDecisionStore();
        const app = buildApp(policyService, store);
        await (0, supertest_1.default)(app)
            .post('/actions/preflight')
            .send({ action: { name: 'export' } })
            .expect(400);
        const records = await store.all();
        expect(records).toHaveLength(0);
    });
    it('propagates simulation failures as gateway errors', async () => {
        const failingService = {
            async simulate() {
                throw new Error('opa unavailable');
            }
        };
        const store = new policy_decisions_js_1.PolicyDecisionStore();
        const app = buildApp(failingService, store);
        const res = await (0, supertest_1.default)(app)
            .post('/actions/preflight')
            .send(baseInput)
            .expect(502);
        expect(res.body).toMatchObject({
            error: 'policy_simulation_failed',
            message: 'opa unavailable'
        });
        expect(await store.all()).toHaveLength(0);
    });
});
