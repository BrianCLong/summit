import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';

const searchEntitiesLatency = new Trend('search_entities_latency');

export const options = {
  stages: [
    { duration: '30s', target: 50 },
    { duration: '1m', target: 50 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    'search_entities_latency': ['p(95)<350'], // p95 must be below 350ms
  },
};

export default function () {
  const url = 'http://localhost:4000/graphql';
  const payload = JSON.stringify({
    query: `
      query SearchEntities($q: String!, $tenant: ID!) {
        searchEntities(q: $q, tenant: $tenant) {
          id
          ... on Person {
            name
          }
        }
      }
    `,
    variables: {
      q: 'test',
      tenant: 'test-tenant',
    },
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const res = http.post(url, payload, params);
  check(res, {
    'is status 200': (r) => r.status === 200,
  });
  searchEntitiesLatency.add(res.timings.duration);
  sleep(1);
}
