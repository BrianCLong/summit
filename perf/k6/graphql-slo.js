import http from 'k6/http';
import { check, sleep } from 'k6';

const QUERY_BODY = JSON.stringify({
  query: '{\n  health {\n    ok\n    timestamp\n  }\n}',
});

export const options = {
  tags: { component: 'graphql', scenario: 'slo-validation' },
  scenarios: {
    steady_queries: {
      executor: 'constant-arrival-rate',
      rate: Number(__ENV.GRAPHQL_QUERY_RPS || 40),
      duration: __ENV.GRAPHQL_TEST_DURATION || '2m',
      preAllocatedVUs: Number(__ENV.GRAPHQL_PREALLOCATED_VUS || 20),
      timeUnit: '1s',
      exec: 'executeQuery',
    },
    steady_mutations: {
      executor: 'constant-arrival-rate',
      rate: Number(__ENV.GRAPHQL_MUTATION_RPS || 10),
      duration: __ENV.GRAPHQL_TEST_DURATION || '2m',
      preAllocatedVUs: Number(__ENV.GRAPHQL_PREALLOCATED_VUS || 10),
      timeUnit: '1s',
      exec: 'executeMutation',
    },
  },
  thresholds: {
    'http_req_duration{operation:query}': ['p(95)<350', 'p(99)<900'],
    'http_req_duration{operation:mutation}': ['p(95)<700', 'p(99)<1500'],
    checks: ['rate>0.99'],
  },
};

const graphqlUrl = __ENV.GRAPHQL_URL || 'http://localhost:4000/graphql';
const mutationBody = JSON.stringify({
  query:
    'mutation Ping($input: PingInput!) {\n  ping(input: $input) {\n    ok\n  }\n}',
  variables: {
    input: { message: 'k6-slo-check', timestamp: new Date().toISOString() },
  },
});

export function executeQuery() {
  const response = http.post(graphqlUrl, QUERY_BODY, {
    headers: {
      'Content-Type': 'application/json',
      'X-Test-Scenario': 'query-slo',
    },
  });
  check(response, {
    'query succeeded': (res) =>
      res.status === 200 && res.json('data.health.ok') === true,
  });
  sleep(0.1);
}

export function executeMutation() {
  const response = http.post(graphqlUrl, mutationBody, {
    headers: {
      'Content-Type': 'application/json',
      'X-Test-Scenario': 'mutation-slo',
    },
  });
  check(response, {
    'mutation succeeded': (res) =>
      res.status === 200 && res.json('data.ping.ok') === true,
  });
  sleep(0.2);
}

export default function () {
  executeQuery();
}
