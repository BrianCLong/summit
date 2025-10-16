import http from 'k6/http';
import { check, sleep } from 'k6';
export const options = {
  vus: 5,
  duration: '1m',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<350'],
  },
};
const url = __ENV.GRAPHQL_URL;
const token = __ENV.GRAPHQL_TOKEN;
export default function () {
  const q = `query Ping { ping }`;
  const res = http.post(url, JSON.stringify({ query: q }), {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  check(res, {
    'status 200': (r) => r.status === 200,
    'has data': (r) => r.json('data.ping') === 'pong',
  });
  sleep(1);
}
