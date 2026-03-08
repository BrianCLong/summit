"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Route test adapted to restricted CI: avoid opening sockets
const server_1 = require("@apollo/server");
const schema_1 = require("@graphql-tools/schema");
const apolloPromPlugin_js_1 = require("../src/metrics/apolloPromPlugin.js");
const cacheMetrics_js_1 = require("../src/metrics/cacheMetrics.js");
const expose_js_1 = require("../src/metrics/expose.js");
const globals_1 = require("@jest/globals");
globals_1.jest.unmock('prom-client');
(0, globals_1.test)('/metrics exposes apollo_* and cache_*', async () => {
    // Generate metrics by executing a couple of GraphQL operations
    const schema = (0, schema_1.makeExecutableSchema)({
        typeDefs: /* GraphQL */ `
      type Query {
        ok: String!
      }
    `,
        resolvers: { Query: { ok: () => 'OK' } },
    });
    const apollo = new server_1.ApolloServer({ schema, plugins: [(0, apolloPromPlugin_js_1.apolloPromPlugin)()] });
    await apollo.start();
    await apollo.executeOperation({ query: '{ ok }', operationName: 'OkQuery' });
    await apollo.stop();
    // Touch cache metrics
    cacheMetrics_js_1.cacheHits.labels('local', 'get', 'test').inc();
    // Directly pull merged metrics text
    const contentType = (0, expose_js_1.metricsContentType)();
    (0, globals_1.expect)(contentType).toContain('text/plain');
    const body = await (0, expose_js_1.metricsText)();
    (0, globals_1.expect)(body).toMatch(/apollo_request_total/);
    (0, globals_1.expect)(body).toMatch(/cache_hits_total/);
});
