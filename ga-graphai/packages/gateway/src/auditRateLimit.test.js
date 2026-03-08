"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const graphql_1 = require("graphql");
const prov_ledger_1 = require("prov-ledger");
const index_js_1 = require("./index.js");
const graphql_cost_js_1 = require("./graphql-cost.js");
const schema = new graphql_1.GraphQLSchema({
    query: new graphql_1.GraphQLObjectType({
        name: 'Query',
        fields: {
            ping: { type: graphql_1.GraphQLString, resolve: () => 'pong' },
        },
    }),
});
(0, vitest_1.describe)('GatewayRuntime security controls', () => {
    (0, vitest_1.it)('records append-only audit events for GraphQL calls', async () => {
        const auditLog = new prov_ledger_1.AppendOnlyAuditLog();
        const knowledgeGraph = {
            getNode: async () => ({
                id: 'svc-1',
                type: 'service',
                data: { name: 'svc' },
            }),
        };
        const runtime = new index_js_1.GatewayRuntime({
            costGuard: { enabled: false },
            knowledgeGraph: { knowledgeGraph },
            audit: { log: auditLog, system: 'test-gateway' },
        });
        const result = await runtime.execute('query { graphNode(id: "svc-1") { id type } }', undefined, { tenantId: 'tenant-a', actorId: 'user-1' });
        (0, vitest_1.expect)(result.errors).toBeUndefined();
        const events = auditLog.list();
        (0, vitest_1.expect)(events).toHaveLength(1);
        (0, vitest_1.expect)(events[0].actor).toBe('user-1');
        (0, vitest_1.expect)(events[0].action).toBe('graphql.execute');
        (0, vitest_1.expect)(events[0].system).toBe('test-gateway');
    });
    (0, vitest_1.it)('kills bursts that exceed configured DDoS guardrails', () => {
        const limiter = new graphql_cost_js_1.GraphQLRateLimiter(schema, {
            maxRequestsPerWindow: 2,
            windowMs: 10_000,
        });
        limiter.beginExecution('query { ping }', 'tenant-a');
        limiter.beginExecution('query { ping }', 'tenant-a');
        const third = limiter.beginExecution('query { ping }', 'tenant-a');
        (0, vitest_1.expect)(third.decision.action).toBe('kill');
        (0, vitest_1.expect)(third.decision.reasonCode).toBe('RATE_LIMIT_WINDOW');
    });
});
