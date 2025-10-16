import http from 'k6/http';
import { check, sleep } from 'k6';
export const options = { vus: 50, duration: '2m' };
export default function () {
  const res = http.get(`${__ENV.BASE_URL}/search?q=graph`, {
    headers: { 'x-tenant-id': 'demo' },
  });
  check(res, { 200: (r) => r.status === 200 });
  sleep(1);
}
