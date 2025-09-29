import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 10,
  duration: '2m',
  thresholds: {
    http_req_duration: ['p(95)<2000'],
  },
};

const golden = [
  {
    q: 'list top 5 connectors by failure rate last 24h',
    expect: (json) => Array.isArray(json?.data) && json.data.length === 5,
  },
  {
    q: 'show relationships between acme corp and subsidiaries',
    expect: (json) => json?.data?.nodes && json.data.nodes.length > 0,
  },
];

export default function () {
  const g = golden[Math.floor(Math.random() * golden.length)];
  const payload = JSON.stringify({ query: g.q });
  const res = http.post(`${__ENV.NLQ_URL}`, payload, {
    headers: { 'Content-Type': 'application/json' },
  });
  check(res, {
    'status 200': (r) => r.status === 200,
    'latency p95': (r) => r.timings.duration < 2000,
    'shape pass': (r) => {
      try {
        return g.expect(r.json());
      } catch (_) {
        return false;
      }
    },
  });
  sleep(1);
}

