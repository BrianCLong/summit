"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const vitest_1 = require("vitest");
const app_js_1 = require("../../app.js");
const EventPublisher_js_1 = require("../../services/EventPublisher.js");
const PolicyDecisionStore_js_1 = require("../../services/PolicyDecisionStore.js");
const buildFixtures = () => {
    const store = new PolicyDecisionStore_js_1.InMemoryPolicyDecisionStore();
    const events = new EventPublisher_js_1.EventPublisher();
    const { app } = (0, app_js_1.buildApp)({ store, events });
    return { app, store, events };
};
(0, vitest_1.describe)('/actions/execute', () => {
    (0, vitest_1.it)('executes when preflight hash matches and returns correlation', async () => {
        const { app, store, events } = buildFixtures();
        const preflightId = 'pf_123';
        store.upsertPreflight({
            id: preflightId,
            action: 'test-action',
            input: { target: 'alpha', level: 2 },
            expiresAt: new Date(Date.now() + 60_000).toISOString(),
            context: { tenant: 'acme' },
        });
        const response = await (0, supertest_1.default)(app)
            .post('/actions/execute')
            .set('x-correlation-id', 'corr-abc')
            .send({
            preflight_id: preflightId,
            action: 'test-action',
            input: { level: 2, target: 'alpha' },
        });
        (0, vitest_1.expect)(response.status).toBe(200);
        (0, vitest_1.expect)(response.body.correlation_id).toBe('corr-abc');
        (0, vitest_1.expect)(response.body.execution_id).toMatch(/^exec_/);
        (0, vitest_1.expect)(events.events).toHaveLength(1);
        (0, vitest_1.expect)(events.events[0]).toMatchObject({
            correlationId: 'corr-abc',
            preflightId,
            action: 'test-action',
        });
    });
    (0, vitest_1.it)('rejects when the computed hash differs from the stored preflight', async () => {
        const { app, store, events } = buildFixtures();
        const preflightId = 'pf_mismatch';
        store.upsertPreflight({
            id: preflightId,
            action: 'test-action',
            input: { original: true },
            expiresAt: new Date(Date.now() + 60_000).toISOString(),
        });
        const response = await (0, supertest_1.default)(app)
            .post('/actions/execute')
            .send({
            preflight_id: preflightId,
            action: 'test-action',
            input: { original: false },
        });
        (0, vitest_1.expect)(response.status).toBe(400);
        (0, vitest_1.expect)(response.body.error).toBe('preflight_hash_mismatch');
        (0, vitest_1.expect)(events.events).toHaveLength(0);
    });
    (0, vitest_1.it)('fails when preflight is missing or expired', async () => {
        const { app, store } = buildFixtures();
        const expiredId = 'pf_expired';
        store.upsertPreflight({
            id: expiredId,
            action: 'test-action',
            input: { ok: true },
            expiresAt: new Date(Date.now() - 1_000).toISOString(),
        });
        const missingResponse = await (0, supertest_1.default)(app)
            .post('/actions/execute')
            .send({
            preflight_id: 'pf_unknown',
            input: { ok: true },
        });
        (0, vitest_1.expect)(missingResponse.status).toBe(404);
        (0, vitest_1.expect)(missingResponse.body.error).toBe('preflight_not_found');
        const expiredResponse = await (0, supertest_1.default)(app)
            .post('/actions/execute')
            .send({
            preflight_id: expiredId,
            input: { ok: true },
        });
        (0, vitest_1.expect)(expiredResponse.status).toBe(410);
        (0, vitest_1.expect)(expiredResponse.body.error).toBe('preflight_expired');
    });
});
