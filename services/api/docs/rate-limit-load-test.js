import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    steady_load: {
      executor: 'constant-arrival-rate',
      rate: 200,
      timeUnit: '1s',
      duration: '2m',
      preAllocatedVUs: 50,
    },
    spike: {
      executor: 'ramping-arrival-rate',
      startRate: 50,
      timeUnit: '1s',
      stages: [
        { target: 600, duration: '30s' },
        { target: 600, duration: '30s' },
        { target: 50, duration: '30s' },
      ],
    },
  },
};

export default function () {
  const apiKey = __ENV.API_KEY || 'loadtest-demo';
  const res = http.post(
    `${__ENV.BASE_URL || 'http://localhost:4000'}/graphql`,
    JSON.stringify({ query: '{ healthCheck }' }),
    {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
    },
  );

  check(res, {
    'status is 200 or 429': (r) => r.status === 200 || r.status === 429,
  });

  if (res.status === 429) {
    sleep(0.5);
  }
}
