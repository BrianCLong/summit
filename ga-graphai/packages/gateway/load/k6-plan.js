import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 30,
  duration: '3m',
};

export default function () {
  const res = http.post(
    'http://localhost:4000/v1/plan',
    JSON.stringify({
      objective: 'Design slice for risk entity graph',
      costCapUsd: 0.0,
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'x-tenant': 'acme-corp',
        'x-purpose': 'investigation',
      },
    },
  );
  check(res, {
    'status 200': (r) => r.status === 200,
    'p95<700ms': (r) => r.timings.duration < 700,
  });
  sleep(1);
}
