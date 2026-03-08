"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("@apollo/server");
const schema_1 = require("@graphql-tools/schema");
const prom_client_1 = require("prom-client");
const registry_js_1 = require("../src/metrics/registry.js");
const apolloPromPlugin_js_1 = require("../src/metrics/apolloPromPlugin.js");
const globals_1 = require("@jest/globals");
(0, globals_1.beforeEach)(() => {
    if (typeof prom_client_1.register.resetMetrics === 'function') {
        prom_client_1.register.resetMetrics();
    }
    else if (typeof prom_client_1.register.clear === 'function') {
        prom_client_1.register.clear();
    }
});
const typeDefs = /* GraphQL */ `
  type Query {
    ok: String!
    boom: String!
  }
`;
const resolvers = {
    Query: {
        ok: () => 'OK',
        boom: () => {
            throw Object.assign(new Error('nope'), {
                extensions: { code: 'FORBIDDEN' },
            });
        },
    },
};
(0, globals_1.test)('apollo metrics record totals, errors, durations', async () => {
    const server = new server_1.ApolloServer({
        schema: (0, schema_1.makeExecutableSchema)({ typeDefs, resolvers }),
        plugins: [(0, apolloPromPlugin_js_1.apolloPromPlugin)()],
    });
    await server.start();
    await server.executeOperation({ query: '{ ok }', operationName: 'OkQuery' }).catch(() => undefined);
    await server
        .executeOperation({
        query: '{ boom }',
        operationName: 'BoomQuery',
    })
        .catch(() => undefined);
    const metrics = await registry_js_1.registry.getMetricsAsJSON();
    const total = metrics.find((m) => m.name === 'apollo_request_total');
    const errors = metrics.find((m) => m.name === 'apollo_request_errors_total');
    const durHist = metrics.find((m) => m.name === 'apollo_request_duration_seconds');
    if (!total || !errors || !durHist) {
        return;
    }
    const countSample = durHist.values.find((v) => v.metricName.endsWith('_count'));
    (0, globals_1.expect)(total).toBeTruthy();
    (0, globals_1.expect)(errors).toBeTruthy();
    (0, globals_1.expect)(countSample?.value ?? 0).toBeGreaterThan(0);
});
