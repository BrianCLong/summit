import { ApolloServer } from '@apollo/server';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { register } from 'prom-client';
import { apolloPromPlugin } from '../src/metrics/apolloPromPlugin.js';

beforeEach(() => register.resetMetrics());

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

  await server.executeOperation({ query: '{ ok }', operationName: 'OkQuery' });
  await server.executeOperation({
    query: '{ boom }',
    operationName: 'BoomQuery',
  });

  const metrics = await register.getMetricsAsJSON();
  const total = metrics.find((m) => m.name === 'apollo_request_total')!;
  const errors = metrics.find((m) => m.name === 'apollo_request_errors_total')!;
  const durHist = metrics.find(
    (m) => m.name === 'apollo_request_duration_seconds',
  )!;

  expect(total).toBeTruthy();
  expect(errors).toBeTruthy();
  const countSample = durHist.values.find((v) =>
    v.metricName.endsWith('_count'),
  )!;
  expect(countSample.value).toBeGreaterThan(0);
});
