import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 3,
  duration: '1m',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1500'],
    checks: ['rate>0.99'],
  },
};

const UI = __ENV.UI_URL || 'http://localhost:3000';
const API = __ENV.API_URL || 'http://localhost:4000';

export default function () {
  const r1 = http.get(UI);
  check(r1, { 'ui 200': (r) => r.status === 200 });
  const r2 = http.get(`${API}/healthz`);
  check(r2, { 'api health 200': (r) => r.status === 200 });
  sleep(0.5);
}
