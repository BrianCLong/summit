
import http from 'k6/http';
import { Trend } from 'k6/metrics';

const GQL_READ_P95 = new Trend('gql_read_p95_ms');

export const options = {
  stages: [
    { duration: '5m', target: 100 }, // ramp up
    { duration: '30m', target: 100 }, // soak
    { duration: '5m', target: 0 },   // ramp down
  ],
  thresholds: {
    'gql_read_p95_ms': ['p(95) < 350'],
    'http_req_failed': ['rate<0.01'], // error rate < 1%
  },
};

const GRAPHQL_ENDPOINT = 'http://localhost:4000/graphql';
const QUERY = `{ entities(first: 50) { id name } }`;

export default function () {
  const res = http.post(GRAPHQL_ENDPOINT, JSON.stringify({ query: QUERY }));
  GQL_READ_P95.add(res.timings.duration);
}
