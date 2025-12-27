import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  thresholds: {
    // SLO: p95 <= 350ms
    http_req_duration: ['p(95)<350'],
    // SLO: Error Rate < 1%
    http_req_failed: ['rate<0.01'],
  },
  stages: [
    { duration: '10s', target: 10 }, // Ramp up
    { duration: '30s', target: 50 }, // Sustained load (approx 50 RPS)
    { duration: '10s', target: 0 },  // Ramp down
  ],
};

const QUERY = `
  query GetEntity($id: ID!) {
    entity(id: $id) {
      id
      type
    }
  }
`;

// Helper to generate random ID
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

export default function () {
  const url = 'http://localhost:4000/graphql';
  // We assume seeded entities e1..e100
  const id = `e${randomInt(1, 100)}`;

  const payload = JSON.stringify({
    query: QUERY,
    variables: { id },
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-id': 'tenant-a',
      // 'Authorization': 'Bearer ...' // Mock auth usually bypassed in dev or handled via headers
    },
  };

  const res = http.post(url, payload, params);

  check(res, {
    'status was 200': (r) => r.status == 200,
    'no errors': (r) => !r.json().errors,
  });

  sleep(0.1); // ~10 RPS per VU
}
