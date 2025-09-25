
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 5,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<500'],
    checks: ['rate>0.95']
  }
};

const query = JSON.stringify({ query: '{ __typename }' });

export default function () {
  const headers = {
    'Content-Type': 'application/json',
    'x-tenant': 'k6-cost-guard',
    'x-user-id': 'load-tester'
  };
  const res = http.post(`${__ENV.GRAPH_ENDPOINT || 'http://localhost:4000/graphql'}`, query, { headers });
  check(res, {
    'status is not 429': r => r.status !== 429,
    'cost header present': r => r.headers['X-Query-Cost'] !== undefined
  });
  sleep(0.5);
}
