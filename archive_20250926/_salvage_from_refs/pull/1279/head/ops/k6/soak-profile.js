import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    reads: {
      executor: 'ramping-arrival-rate',
      startRate: 50,
      timeUnit: '1s',
      preAllocatedVUs: 200,
      stages: [
        { duration: '10m', target: 300 },
        { duration: '100m', target: 300 },
      ],
    },
    writes: {
      executor: 'constant-arrival-rate',
      rate: 60,
      timeUnit: '1s',
      duration: '120m',
      preAllocatedVUs: 300,
    },
  },
  thresholds: {
    'http_req_duration{tag:read}': ['p(95)<350'],
    'http_req_duration{tag:write}': ['p(95)<700'],
    http_req_failed: ['rate<0.001'],
  },
};

export default function () {
  const q = '{ node(id:"123"){ id name } }';
  const res = http.post(
    __ENV.API_URL,
    JSON.stringify({ query: q }),
    { headers: { 'Content-Type': 'application/json', 'x-apq-hash': __ENV.APQ_HASH } },
  );
  check(res, { 'status 200': (r) => r.status === 200 });
  sleep(0.5);
}

