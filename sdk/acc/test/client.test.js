"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const index_js_1 = require("../src/index.js");
const samplePlan = {
    mode: 'strong',
    stalenessSlaMs: 0,
    route: {
        quorum: ['us-east-primary', 'us-west-sync'],
        replicas: [
            {
                name: 'us-east-primary',
                region: 'us-east',
                role: 'primary',
                latencyMs: 8,
                stalenessMs: 1,
                isQuorum: true,
                isPrimary: true,
                syncRequired: true
            }
        ],
        estimatedLatencyMs: 8,
        consistencyScore: 1,
        boundedStalenessSla: 0
    },
    explain: [
        { stage: 'policy-match', message: 'matched policy rule' },
        { stage: 'route', message: 'selected quorum', meta: { quorum: ['us-east-primary'] } }
    ]
};
(0, vitest_1.describe)('ACCClient', () => {
    (0, vitest_1.it)('sends plan requests with deterministic payload', async () => {
        const fetchMock = vitest_1.vi.fn().mockResolvedValue({
            ok: true,
            json: async () => samplePlan
        });
        const client = new index_js_1.ACCClient({ baseUrl: 'http://acc:8088', fetchImpl: fetchMock });
        const request = {
            id: 'req-1',
            operation: 'read',
            dataClass: 'pii',
            purpose: 'authentication',
            jurisdiction: 'us'
        };
        const plan = await client.plan(request);
        (0, vitest_1.expect)(fetchMock).toHaveBeenCalledWith('http://acc:8088/plan', vitest_1.expect.any(Object));
        (0, vitest_1.expect)(plan.mode).toBe('strong');
        (0, vitest_1.expect)((0, index_js_1.explainSummary)(plan)).toBe('strong via policy-match -> route');
    });
    (0, vitest_1.it)('raises errors with response payload when plan fails', async () => {
        const fetchMock = vitest_1.vi.fn().mockResolvedValue({
            ok: false,
            status: 400,
            text: async () => 'no matching policy rule'
        });
        const client = new index_js_1.ACCClient({ baseUrl: 'http://acc:8088', fetchImpl: fetchMock });
        await (0, vitest_1.expect)(client.plan({
            operation: 'read',
            dataClass: 'unknown',
            purpose: 'none',
            jurisdiction: 'na'
        })).rejects.toThrow(/no matching policy rule/);
    });
    (0, vitest_1.it)('updates replica metrics', async () => {
        const fetchMock = vitest_1.vi
            .fn()
            .mockResolvedValueOnce({ ok: true, json: async () => samplePlan })
            .mockResolvedValueOnce({ ok: true, json: async () => ({ status: 'updated' }) });
        const client = new index_js_1.ACCClient({ baseUrl: 'http://acc:8088', fetchImpl: fetchMock });
        await client.plan({
            operation: 'read',
            dataClass: 'pii',
            purpose: 'authentication',
            jurisdiction: 'us'
        });
        await client.updateReplicaMetrics({ name: 'us-east-primary', latencyMs: 6, stalenessMs: 10 });
        (0, vitest_1.expect)(fetchMock).toHaveBeenNthCalledWith(2, 'http://acc:8088/replica', vitest_1.expect.any(Object));
    });
    (0, vitest_1.it)('decorates arbitrary request objects with policy headers', () => {
        const headers = (0, index_js_1.withPolicyTags)({}, {
            dataClass: 'behavioral',
            purpose: 'personalization',
            jurisdiction: 'us'
        });
        (0, vitest_1.expect)(headers['x-acc-data-class']).toBe('behavioral');
    });
});
