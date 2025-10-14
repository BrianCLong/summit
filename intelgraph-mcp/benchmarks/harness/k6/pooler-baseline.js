import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = { vus: 50, duration: '1m' };

export default function () {
  const res = http.post(`${__ENV.ENDPOINT}/v1/session`, JSON.stringify({ toolClass: 'github' }), {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${__ENV.TOKEN}`
    }
  });
  check(res, { '201': (r) => r.status === 201 });
  sleep(0.1);
}
