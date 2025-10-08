import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = { thresholds: { http_req_duration: ['p(95)<1500'] } };

export default function () {
  const res = http.get(__ENV.TARGET || 'http://localhost:8080/healthz');
  check(res, { 'status is 2xx': (r) => r.status >= 200 && r.status < 300 });
  sleep(1);
}
