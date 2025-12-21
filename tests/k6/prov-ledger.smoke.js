import http from 'k6/http';
import { check } from 'k6';

export const options = { vus: 1, duration: '30s' };

export default function () {
  const res = http.get(`${__ENV.BASE}/ledger/export/123`);
  check(res, {
    '200': (r) => r.status === 200,
    '<=250ms': (r) => r.timings.duration <= 250,
  });
}
