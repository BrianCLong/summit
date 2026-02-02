import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';
import { config, headers as commonHeaders } from './config.js';

export let errorRate = new Rate('errors');

export let options = {
  stages: [
    { duration: '1m', target: 10 }, // ramp up to 10 users
    { duration: '3m', target: 50 }, // stay at 50 users
    { duration: '1m', target: 0 }, // ramp down to 0 users
  ],
  thresholds: {
    ...config.thresholds,
    errors: ['rate<0.01'], // custom metric threshold
  },
};

export default function () {
  const headers = commonHeaders;
  const query = `
    query {
      org(id: "some-org-id") {
        name
      }
    }
  `;
  const res = http.post(
    `${config.baseUrl}/graphql`,
    JSON.stringify({ query: query }),
    { headers: headers },
  );

  check(res, {
    'is status 200': (r) => r.status === 200,
    'body contains data': (r) => r.body.includes('name'),
  }) || errorRate.add(1);

  sleep(1);
}
