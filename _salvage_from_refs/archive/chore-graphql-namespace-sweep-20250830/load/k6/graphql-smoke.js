import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  vus: 1,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<800'],
  },
};

const API = __ENV.API_URL || 'http://localhost:4000/graphql';

export default function () {
  const payload = JSON.stringify({ query: '{ _empty }' });
  const res = http.post(API, payload, { headers: { 'Content-Type': 'application/json' } });
  check(res, { 'status is 200': (r) => r.status === 200 });
  sleep(1);
}

