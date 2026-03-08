"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const supertest_1 = __importDefault(require("supertest"));
const execute_1 = require("../src/routes/actions/execute");
class InMemoryDecisionStore {
    decisions = new Map();
    executions = [];
    async get(preflightId) {
        return this.decisions.get(preflightId);
    }
    async markExecuted(preflightId, receiptId) {
        this.executions.push({ preflightId, receiptId });
    }
    add(decision) {
        this.decisions.set(decision.id, decision);
    }
}
class InMemoryEventPublisher {
    events = [];
    async publish(event) {
        this.events.push(event);
    }
}
const buildApp = (store, publisher) => {
    const app = (0, express_1.default)();
    app.use(express_1.default.json());
    app.use((0, execute_1.createExecuteRouter)({
        policyDecisionStore: store,
        eventPublisher: publisher,
        now: () => new Date('2025-01-01T00:00:00Z'),
    }));
    return app;
};
describe('POST /actions/execute', () => {
    it('accepts execution when the preflight hash matches and is not expired', async () => {
        const store = new InMemoryDecisionStore();
        const publisher = new InMemoryEventPublisher();
        const inputs = { target: 'alpha', resources: ['case-1'] };
        const decision = {
            id: 'pf-1',
            inputHash: (0, execute_1.computeInputHash)(inputs),
            expiresAt: new Date('2025-01-01T00:10:00Z'),
            status: 'allow',
            context: { policy_id: 'policy-42' },
        };
        store.add(decision);
        const app = buildApp(store, publisher);
        const response = await (0, supertest_1.default)(app)
            .post('/actions/execute')
            .send({ preflight_id: decision.id, inputs });
        expect(response.status).toBe(202);
        expect(response.body.preflight_id).toBe(decision.id);
        expect(response.body.trace_id).toBeTruthy();
        expect(response.body.receipt_id).toBeTruthy();
        expect(store.executions).toContainEqual({
            preflightId: decision.id,
            receiptId: response.body.receipt_id,
        });
        expect(publisher.events).toHaveLength(1);
        expect(publisher.events[0]).toMatchObject({
            type: 'action.execution.accepted',
            preflightId: decision.id,
            traceId: response.body.trace_id,
            receiptId: response.body.receipt_id,
            inputsHash: decision.inputHash,
            decisionContext: decision.context,
        });
    });
    it('rejects execution when the payload hash does not match the preflight', async () => {
        const store = new InMemoryDecisionStore();
        const publisher = new InMemoryEventPublisher();
        const decision = {
            id: 'pf-2',
            inputHash: (0, execute_1.computeInputHash)({ original: true }),
            expiresAt: new Date('2025-01-01T00:10:00Z'),
            status: 'allow',
        };
        store.add(decision);
        const app = buildApp(store, publisher);
        const response = await (0, supertest_1.default)(app)
            .post('/actions/execute')
            .send({
            preflight_id: decision.id,
            inputs: { original: false },
        });
        expect(response.status).toBe(400);
        expect(response.body.error).toBe('input_hash_mismatch');
        expect(response.body.trace_id).toBeTruthy();
        expect(response.body.receipt_id).toBeTruthy();
        expect(publisher.events).toHaveLength(1);
        expect(publisher.events[0]).toMatchObject({
            type: 'action.execution.rejected',
            reason: 'input_hash_mismatch',
            preflightId: decision.id,
            traceId: response.body.trace_id,
            receiptId: response.body.receipt_id,
        });
    });
    it('rejects execution when the preflight is expired', async () => {
        const store = new InMemoryDecisionStore();
        const publisher = new InMemoryEventPublisher();
        const inputs = { id: 'case-1' };
        const decision = {
            id: 'pf-3',
            inputHash: (0, execute_1.computeInputHash)(inputs),
            expiresAt: new Date('2024-12-31T23:59:00Z'),
            status: 'allow',
        };
        store.add(decision);
        const app = buildApp(store, publisher);
        const response = await (0, supertest_1.default)(app)
            .post('/actions/execute')
            .send({ preflight_id: decision.id, inputs });
        expect(response.status).toBe(410);
        expect(response.body.error).toBe('preflight_expired');
        expect(response.body.trace_id).toBeTruthy();
        expect(response.body.receipt_id).toBeTruthy();
        expect(publisher.events).toHaveLength(1);
        expect(publisher.events[0]).toMatchObject({
            type: 'action.execution.rejected',
            reason: 'preflight_expired',
            preflightId: decision.id,
            traceId: response.body.trace_id,
            receiptId: response.body.receipt_id,
        });
    });
});
