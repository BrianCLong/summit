import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '30s', target: 20 }, // simulate ramp-up of traffic from 1 to 20 users over 30 seconds.
    { duration: '1m', target: 20 }, // stay at 20 users for 1 minute
    { duration: '20s', target: 0 }, // ramp-down to 0 users over 20 seconds
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
  },
};

export default function () {
  const url = 'http://localhost:4000/graphql'; // Assuming GraphQL endpoint
  const headers = {
    'Content-Type': 'application/json',
  };
  const query = `
    query {
      entities(limit: 10) {
        id
        type
      }
    }
  `;

  const res = http.post(url, JSON.stringify({ query: query }), {
    headers: headers,
  });

  check(res, {
    'is status 200': (r) => r.status === 200,
    'response body is not empty': (r) => r.body.length > 0,
  });

  sleep(1);
}
