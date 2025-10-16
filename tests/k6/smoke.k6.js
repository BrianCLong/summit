// tests/smoke.k6.js
import http from 'k6/http';
import { check, sleep } from 'k6';
export default function () {
  const res = http.get(`${__ENV.BASEURL}/healthz`);
  check(res, { 'health 200': (r) => r.status === 200 });
  sleep(1);
}
