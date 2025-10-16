import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 2,
  duration: '20s',
  thresholds: { http_req_failed: ['rate<0.02'] },
};

export default function () {
  const base = __ENV.UI_URL || 'http://localhost:3000';
  const api = __ENV.API_URL || 'http://localhost:4000';
  check(http.get(base), { 'ui up': (r) => r.status === 200 });
  const r = http.post(
    `${api}/graphql`,
    JSON.stringify({
      operationName: 'Ping',
      query: 'query Ping { __typename }',
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${__ENV.SMOKE_JWT || ''}`,
      },
    },
  );
  check(r, {
    'api gql ok': (s) =>
      s.status === 200 && String(s.body || '').includes('__typename'),
  });
  sleep(1);
}
