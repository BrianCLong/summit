import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '1m', target: 50 }, // ramp-up to 50 users
    { duration: '3m', target: 50 }, // stay at 50 users
    { duration: '30s', target: 0 },  // ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<200'], // 95% of requests below 200ms
  },
};

export default function () {
  const url = 'http://localhost:4000/graphql';
  const headers = { 'Content-Type': 'application/json' };
  const query = `
    query {
      entities(limit: 100) {
        id
        type
        createdAt
      }
    }
  `;

  const res = http.post(url, JSON.stringify({ query: query }), { headers: headers });

  check(res, {
    'is status 200': (r) => r.status === 200,
    'response body is not empty': (r) => r.body.length > 0,
  });

  sleep(0.5);
}