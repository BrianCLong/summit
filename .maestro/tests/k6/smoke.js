import http from 'k6/http';
import { check, sleep } from 'k6';
export const options = {
  vus: 10,
  duration: '1m',
  thresholds: {
    http_req_failed: ['rate<0.001'], // <0.1%
    http_req_duration: ['p(95)<350'], // <350ms
  },
};
const BASE = __ENV.BASE_URL || 'http://localhost:4000';
export default function () {
  const res = http.get(`${BASE}/healthz`);
  check(res, { 200: (r) => r.status === 200 });
  sleep(0.2);
}
