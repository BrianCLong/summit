import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    multimodal_extraction: {
      executor: 'ramping-arrival-rate',
      startRate: 10,
      timeUnit: '1s',
      preAllocatedVUs: 50,
      maxVUs: 150,
      stages: [
        { duration: '1m', target: 50 },
        { duration: '2m', target: 120 },
        { duration: '30s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<900', 'avg<600'],
    'checks{kind:multimodal}': ['rate>0.98'],
  },
};

export default function () {
  const res = http.post(
    'http://localhost:4000/v1/plan',
    JSON.stringify({
      objective: 'Extract multimodal threat evidence package',
      costCapUsd: 0.0,
      requiresMultimodal: true,
      sources: ['s3://intel/images/incident-2025-09-12.png', 's3://intel/text/brief.md'],
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'x-tenant': 'acme-corp',
        'x-purpose': 'investigation',
      },
      tags: { kind: 'multimodal' },
    },
  );
  check(res, {
    'status 200': (r) => r.status === 200,
    'p95<900ms': (r) => r.timings.duration < 900,
  });
  sleep(1);
}
