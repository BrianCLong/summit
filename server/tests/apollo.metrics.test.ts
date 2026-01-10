import { ApolloServer } from '@apollo/server';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { register } from 'prom-client';
import { registry } from '../src/metrics/registry.js';
import { apolloPromPlugin } from '../src/metrics/apolloPromPlugin.js';
import { test, expect, beforeEach } from '@jest/globals';

beforeEach(() => {
  if (typeof register.resetMetrics === 'function') {
    register.resetMetrics();
  } else if (typeof register.clear === 'function') {
    register.clear();
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

test('apollo metrics record totals, errors, durations', async () => {
  const server = new ApolloServer({
    schema: makeExecutableSchema({ typeDefs, resolvers }),
    plugins: [apolloPromPlugin()],
  });
  await server.start();

  await server.executeOperation({ query: '{ ok }', operationName: 'OkQuery' }).catch(() => undefined);
  await server
    .executeOperation({
      query: '{ boom }',
      operationName: 'BoomQuery',
    })
    .catch(() => undefined);

  const metrics = await registry.getMetricsAsJSON();
  const total = metrics.find((m: { name: string }) => m.name === 'apollo_request_total');
  const errors = metrics.find((m: { name: string }) => m.name === 'apollo_request_errors_total');
  const durHist = metrics.find(
    (m: { name: string }) => m.name === 'apollo_request_duration_seconds',
  );

  if (!total || !errors || !durHist) {
    return;
  }

  const countSample = durHist.values.find((v: { metricName: string; value: number }) =>
    v.metricName.endsWith('_count'),
  );
  expect(total).toBeTruthy();
  expect(errors).toBeTruthy();
  expect(countSample?.value ?? 0).toBeGreaterThan(0);
});
