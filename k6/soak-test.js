import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

export let errorRate = new Rate('errors');

// Soak test: Moderate load for a long duration to detect memory leaks, resource exhaustion
export let options = {
  stages: [
    { duration: '2m', target: 20 },  // Ramp up to 20 users
    { duration: '4h', target: 20 },  // Maintain 20 users for 4 hours
    { duration: '2m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'], // Allow slightly higher latency for soak
    errors: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  const headers = { 'Content-Type': 'application/json' };

  // 1. Health check
  const healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, { 'health is 200': (r) => r.status === 200 }) || errorRate.add(1);

  // 2. GraphQL Query (simulated graph exploration)
  const query = `
    query GetGraphData {
      investigation(id: "test-investigation") {
        id
        nodes {
          id
          label
        }
      }
    }
  `;

  const gqlRes = http.post(
    `${BASE_URL}/graphql`,
    JSON.stringify({ query: query }),
    { headers: headers }
  );

  check(gqlRes, {
    'graphql is 200': (r) => r.status === 200,
  }) || errorRate.add(1);

  sleep(Math.random() * 2 + 1); // Sleep 1-3 seconds
}
