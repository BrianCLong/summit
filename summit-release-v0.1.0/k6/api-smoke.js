import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = { vus: 2, duration: '30s' };

export default function () {
  const res = http.post('http://localhost:4000/graphql', JSON.stringify({
    query: 'query { __typename }'
  }), { headers: { 'Content-Type': 'application/json' }});
  check(res, { 'status 200': r => r.status === 200 });
  sleep(1);
}