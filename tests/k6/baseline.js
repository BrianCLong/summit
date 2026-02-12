import http from 'k6/http';
import { check } from 'k6';
export const options = {
  stages: [
    { duration: '2m', target: 50 },
    { duration: '3m', target: 50 },
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<350'],
  },
};
const url = __ENV.GRAPHQL_URL;
const token = __ENV.GRAPHQL_TOKEN;
export default function () {
  const q = `query Search($q:String!){ search(q:$q){ id name } }`;
  const res = http.post(
    url,
    JSON.stringify({ query: q, variables: { q: 'acme' } }),
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
  );
  check(res, { 200: (r) => r.status === 200 });
}
