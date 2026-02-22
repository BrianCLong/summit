import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 1,
  duration: '10s',
  thresholds: {
    http_req_duration: ['p(95)<1500'], // 95% of requests must complete below 1.5s
    http_req_failed: ['rate<0.02'], // http errors should be less than 2%
  },
};

export default function () {
  // Target URL can be overridden by env var TARGET_HOST
  const target = __ENV.TARGET_HOST || 'http://localhost:3000';
  const res = http.get(`${target}/health`);
  check(res, { 'status was 200': (r) => r.status == 200 });
  sleep(1);
}
