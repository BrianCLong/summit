import http from 'k6/http';
import { check, sleep } from 'k6';
import { config } from './config.js';

export const options = {
  vus: 1,
  duration: '30s',
  thresholds: config.thresholds,
};

export default function () {
  const baseUrl = __ENV.BASE_URL || 'http://localhost:8080';

  const res = http.get(`${baseUrl}/health/live`);

  check(res, {
    'status is 200': (r) => r.status === 200,
    'status is alive': (r) => r.json('status') === 'alive',
  });

  sleep(1);
}
