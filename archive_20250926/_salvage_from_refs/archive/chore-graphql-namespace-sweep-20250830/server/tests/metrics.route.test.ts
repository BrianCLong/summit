// Route test adapted to restricted CI: avoid opening sockets
import { ApolloServer } from '@apollo/server';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { apolloPromPlugin } from '../src/metrics/apolloPromPlugin.js';
import { cacheHits } from '../src/metrics/cacheMetrics.js';
import { metricsText, metricsContentType } from '../src/metrics/expose.js';

test('/metrics exposes apollo_* and cache_*', async () => {
  // Generate metrics by executing a couple of GraphQL operations
  const schema = makeExecutableSchema({
    typeDefs: /* GraphQL */ `type Query { ok: String! }`,
    resolvers: { Query: { ok: () => 'OK' } },
  });
  const apollo = new ApolloServer({ schema, plugins: [apolloPromPlugin()] });
  await apollo.start();
  await apollo.executeOperation({ query: '{ ok }', operationName: 'OkQuery' });
  await apollo.stop();

  // Touch cache metrics
  cacheHits.labels('local', 'get', 'test').inc();

  // Directly pull merged metrics text
  const contentType = metricsContentType();
  expect(contentType).toContain('text/plain');
  const body = await metricsText();
  expect(body).toMatch(/apollo_request_total/);
  expect(body).toMatch(/cache_hits_total/);
});
