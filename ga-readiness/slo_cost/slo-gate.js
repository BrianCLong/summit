import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 50 }, // Ramp up to 50 users (1.2x load)
    { duration: '1m', target: 50 },  // Stay at peak
    { duration: '30s', target: 0 },  // Ramp down
  ],
  thresholds: {
    'http_req_duration{type:read}': ['p(95)<350'], // Strict Guardrail: 350ms for reads
    'http_req_duration{type:write}': ['p(95)<700'], // Strict Guardrail: 700ms for writes
    'http_req_failed': ['rate<0.001'], // 99.9% Availability
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  // Read Operation (Search)
  const searchRes = http.get(`${BASE_URL}/api/v1/search?q=test`, {
    tags: { type: 'read' },
  });
  check(searchRes, { 'status is 200': (r) => r.status === 200 });

  // Write Operation (Ingest) - Simulated
  const payload = JSON.stringify({
    content: "Test document content",
    source: "load-test"
  });

  const params = {
    headers: { 'Content-Type': 'application/json' },
    tags: { type: 'write' },
  };

  const writeRes = http.post(`${BASE_URL}/api/v1/ingest`, payload, params);
  check(writeRes, { 'status is 202': (r) => r.status === 202 });

  sleep(1);
}
