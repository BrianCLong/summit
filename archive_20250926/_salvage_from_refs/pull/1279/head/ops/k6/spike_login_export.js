import { check, sleep } from 'k6';
import http from 'k6/http';

export const options = {
  stages: [ { duration: '2m', target: 20 }, { duration: '2m', target: 400 }, { duration: '2m', target: 20 } ],
  thresholds: { http_req_failed: ['rate<0.01'] },
};

export default function () {
  const res = http.post(`${__ENV.API_URL}/auth/login`, JSON.stringify({ user: __ENV.USER, pass: __ENV.PASS }), { headers: { 'Content-Type': 'application/json' } });
  check(res, { 'login ok': (r) => r.status === 200 });

  const token = res.json('token');
  const exp = http.get(`${__ENV.API_URL}/export/case?id=42`, { headers: { Authorization: `Bearer ${token}` } });
  check(exp, { 'export ok': (r) => r.status === 200 });
  sleep(1);
}

