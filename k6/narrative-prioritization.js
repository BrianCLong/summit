import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 }, // Ramp up to 20 users
    { duration: '1m', target: 20 },  // Stay at 20 users
    { duration: '30s', target: 0 },  // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1500'], // 95% of requests must be faster than 1500ms
    http_req_failed: ['rate<0.01'],    // Error rate must be less than 1%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  const payload = JSON.stringify({
    text: 'Urgent: Infrastructure attack detected on the power grid. Massive outage expected.',
    entities: ['PowerGrid', 'Infrastructure', 'AttackerX'],
    source: 'reliable_intel_source_001',
    metadata: {
        timestamp: new Date().toISOString()
    }
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer dev-token', // Assuming dev env or mock auth
    },
  };

  const res = http.post(`${BASE_URL}/api/narrative-prioritization/prioritize`, payload, params);

  check(res, {
    'status is 200': (r) => r.status === 200,
    'has priority': (r) => JSON.parse(r.body).priority !== undefined,
    'has score': (r) => JSON.parse(r.body).score !== undefined,
  });

  sleep(1);
}
