import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    smoke: { executor: 'constant-vus', vus: 5, duration: '1m' },
    ramp: {
      executor: 'ramping-vus',
      startVUs: 10,
      stages: [
        { duration: '2m', target: 50 },
        { duration: '2m', target: 100 },
        { duration: '2m', target: 0 },
      ],
      startTime: '1m',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.005'],
    http_req_duration: ['p(95)<800'],
  },
};

const BASE = __ENV.BASE || 'http://localhost:4000/api/maestro/v1';

export default function () {
  const res1 = http.get(`${BASE}/mcp/servers`);
  check(res1, { 'servers 200': (r) => r.status === 200 });
  sleep(0.2);
}
