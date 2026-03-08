"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const server_js_1 = require("./server.js");
const allow = jest.fn(async () => ({ allow: true }));
const deny = jest.fn(async () => ({ allow: false, reason: 'denied' }));
const stepUp = jest.fn(async () => ({ allow: true, stepUpRequired: true, reason: 'step-up' }));
describe('golden-path service', () => {
    beforeEach(() => {
        allow.mockClear();
        deny.mockClear();
        stepUp.mockClear();
    });
    it('returns hello world', async () => {
        const app = (0, server_js_1.createServer)();
        const res = await (0, supertest_1.default)(app).get('/hello');
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ message: 'hello, world' });
    });
    it('exposes health endpoints', async () => {
        const app = (0, server_js_1.createServer)();
        const health = await (0, supertest_1.default)(app).get('/healthz');
        expect(health.status).toBe(200);
        const ready = await (0, supertest_1.default)(app).get('/readyz');
        expect(ready.status).toBe(200);
    });
    it('guards secure approval with policy allow/deny', async () => {
        const app = (0, server_js_1.createServer)({ policyEvaluator: deny });
        const res = await (0, supertest_1.default)(app)
            .post('/payments/abc/approve')
            .set('x-user-id', 'u1')
            .send({ amount: 100 });
        expect(res.status).toBe(403);
        expect(res.body.reason).toBe('denied');
    });
    it('requires step-up when policy obligates it', async () => {
        const app = (0, server_js_1.createServer)({ policyEvaluator: stepUp });
        const res = await (0, supertest_1.default)(app)
            .post('/payments/abc/approve')
            .set('x-user-id', 'u1')
            .send({ amount: 100 });
        expect(res.status).toBe(401);
        expect(res.body.message).toBe('step-up-required');
    });
    it('approves when policy allows and step-up token is present', async () => {
        const app = (0, server_js_1.createServer)({ policyEvaluator: stepUp });
        const res = await (0, supertest_1.default)(app)
            .post('/payments/abc/approve')
            .set('x-user-id', 'u1')
            .set('x-step-up-token', 'asserted')
            .send({ amount: 50 });
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('approved');
    });
    it('can disable metrics endpoint', async () => {
        const app = (0, server_js_1.createServer)({ metricsEnabled: false });
        const res = await (0, supertest_1.default)(app).get('/metrics');
        expect(res.status).toBe(404);
    });
    it('omits secure route when feature flag is off', async () => {
        const app = (0, server_js_1.createServer)({ secureApprovalEnabled: false });
        const res = await (0, supertest_1.default)(app)
            .post('/payments/abc/approve')
            .set('x-user-id', 'u1')
            .send({ amount: 100 });
        expect(res.status).toBe(404);
    });
});
