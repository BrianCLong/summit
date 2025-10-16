import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up to 100 users
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 200 }, // Ramp up to 200 users
    { duration: '5m', target: 200 }, // Stay at 200 users
    { duration: '2m', target: 0 }, // Ramp down to 0 users
  ],
  thresholds: {
    http_req_failed: ['rate<0.02'], // Error rate should be less than 2%
    http_req_duration: ['p(95)<2000'], // 95% of requests should be below 2s
    http_req_duration: ['p(99)<5000'], // 99% of requests should be below 5s
  },
};

export default function () {
  const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';

  // Simulate realistic user journey
  const scenarios = [
    () => {
      // Search scenario
      const searchRes = http.get(`${baseUrl}/api/v1/search?q=test`);
      check(searchRes, { 'search works': (r) => r.status === 200 });
    },
    () => {
      // Graph visualization scenario
      const graphRes = http.get(`${baseUrl}/api/v1/graph/visualization`);
      check(graphRes, { 'graph viz works': (r) => r.status === 200 });
    },
    () => {
      // Entity analysis scenario
      const entityRes = http.post(
        `${baseUrl}/api/v1/analyze`,
        JSON.stringify({
          type: 'entity',
          data: { name: 'test-entity' },
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        },
      );
      check(entityRes, { 'analysis works': (r) => r.status === 200 });
    },
  ];

  // Randomly pick a scenario
  const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
  scenario();

  sleep(Math.random() * 3 + 1); // Random sleep between 1-4 seconds
}
