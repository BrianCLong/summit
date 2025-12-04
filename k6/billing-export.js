import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '1m', target: 20 },
    { duration: '10s', target: 0 },
  ],
};

export default function () {
  const tenantId = 'tenant-123';
  const res = http.post(`http://localhost:4000/api/billing/export/${tenantId}`);

  check(res, {
    'status is 200': (r) => r.status === 200,
    'report generated': (r) => r.json('success') === true,
  });
  sleep(1);
}
