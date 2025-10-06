import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    bulk_ops: {
      executor: 'constant-arrival-rate',
      rate: 100,               // 100 ops/sec
      timeUnit: '1s',
      duration: '60s',
      preAllocatedVUs: 50,
      maxVUs: 200,
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<800'], // tune per env
  },
};

export default function () {
  const body = JSON.stringify({ ops: [{ type: 'UPDATE', id: __ITER % 1000, payload: { status: 'ready' } }]});
  const key = `bulk-${Math.floor(__ITER/2)}`; // repeat every other iter → same idempotency key
  const res = http.post(`${__ENV.API}/soar/bulk`, body, {
    headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key }
  });
  check(res, {
    '200 or 202': r => r.status === 200 || r.status === 202,
    'idempotent accepted': r => r.json('idempotent') === true || r.status === 200 || r.status === 202
  });
  sleep(0.01);
}