import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  thresholds: {
    http_req_duration: ['p(95)<250'],
  },
  vus: 1,
  duration: '10s',
};

export default function () {
  const res = http.get('http://localhost:7011/ledger/export/demo-case');
  check(res, {
    'status is 200': (r) => r.status === 200,
  });
  sleep(1);
}
