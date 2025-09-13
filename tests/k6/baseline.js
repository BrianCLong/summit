
import http from 'k6/http';
import { Trend } from 'k6/metrics';

const GQL_READ_P95 = new Trend('gql_read_p95_ms');
const GQL_WRITE_P95 = new Trend('gql_write_p95_ms');

export const options = {
  scenarios: {
    baseline_reads: {
      executor: 'constant-arrival-rate',
      rate: 50,
      timeUnit: '1s',
      duration: '2m',
      preAllocatedVUs: 50,
      exec: 'reads',
    },
    baseline_writes: {
      executor: 'constant-arrival-rate',
      rate: 10,
      timeUnit: '1s',
      duration: '2m',
      preAllocatedVUs: 20,
      exec: 'writes',
    },
  },
  thresholds: {
    'gql_read_p95_ms': ['p(95) < 350'],
    'gql_write_p95_ms': ['p(95) < 700'],
  },
};

const GRAPHQL_ENDPOINT = 'http://localhost:4000/graphql';

export function reads() {
  const res = http.post(GRAPHQL_ENDPOINT, JSON.stringify({ query: '{ entities { id } }' }));
  GQL_READ_P95.add(res.timings.duration);
}

export function writes() {
  const res = http.post(GRAPHQL_ENDPOINT, JSON.stringify({ query: 'mutation { createEntity(name: "test") { id } }' }));
  GQL_WRITE_P95.add(res.timings.duration);
}
