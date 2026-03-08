"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const index_js_1 = require("./index.js");
(0, vitest_1.describe)('GatewayRuntime knowledge graph integration', () => {
    const cache = new Map();
    const cacheClient = {
        async get(key) {
            return cache.get(key) ?? null;
        },
        async setEx(key, _ttlSeconds, value) {
            cache.set(key, value);
        },
    };
    (0, vitest_1.beforeEach)(() => {
        cache.clear();
    });
    (0, vitest_1.it)('batches node loads via DataLoader and populates cache', async () => {
        const knowledgeGraph = {
            getNode: vitest_1.vi
                .fn()
                .mockResolvedValue({ id: 'svc-1', type: 'service', data: { name: 'svc' } }),
        };
        const runtime = new index_js_1.GatewayRuntime({
            costGuard: { enabled: false },
            knowledgeGraph: { knowledgeGraph, cacheClient, cacheTtlSeconds: 60 },
        });
        const query = `query($ids: [ID!]!) { graphNodes(ids: $ids) { id type } }`;
        const result = await runtime.execute(query, { ids: ['svc-1', 'svc-1'] });
        (0, vitest_1.expect)(result.errors).toBeUndefined();
        (0, vitest_1.expect)(result.data?.graphNodes).toHaveLength(2);
        (0, vitest_1.expect)(knowledgeGraph.getNode).toHaveBeenCalledTimes(1);
        (0, vitest_1.expect)(cache.has('kg:node:svc-1')).toBe(true);
    });
    (0, vitest_1.it)('returns cached nodes without hitting the knowledge graph', async () => {
        cache.set('kg:node:svc-cached', JSON.stringify({ id: 'svc-cached', type: 'service', data: {} }));
        const knowledgeGraph = {
            getNode: vitest_1.vi.fn().mockResolvedValue(null),
        };
        const runtime = new index_js_1.GatewayRuntime({
            costGuard: { enabled: false },
            knowledgeGraph: { knowledgeGraph, cacheClient, cacheTtlSeconds: 60 },
        });
        const query = `query { graphNode(id: "svc-cached") { id type } }`;
        const result = await runtime.execute(query);
        (0, vitest_1.expect)(result.errors).toBeUndefined();
        (0, vitest_1.expect)(result.data?.graphNode?.id).toBe('svc-cached');
        (0, vitest_1.expect)(knowledgeGraph.getNode).not.toHaveBeenCalled();
    });
});
