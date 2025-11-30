import http from 'k6/http';
import { sleep, check } from 'k6';

export const options = { vus: 5, duration: '2m' };

export default function () {
  const res = http.get(`${__ENV.BASE_URL}/health`);
  check(res, { 'status is 2xx': r => r.status >= 200 && r.status < 300 });
  sleep(1);
}
