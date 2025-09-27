import http from 'k6/http';
import { check, sleep } from 'k6';
export const options = {
  scenarios: { rps: { executor: 'constant-arrival-rate', rate: 50, timeUnit: '1s', duration: '5m', preAllocatedVUs: 50 } },
  thresholds: {
    http_req_duration: ['p(95)<350'],
    checks: ['rate>0.99']
  }
};
export default function () {
  const url = __ENV.COS_GQL_URL;
  const q = JSON.stringify({ query: '{ __typename }' });
  const res = http.post(url, q, { headers: { 'Content-Type': 'application/json' } });
  check(res, { 'status 200': (r) => r.status === 200 });
  sleep(0.1);
}

