import http from 'k6/http';
import { check } from 'k6';
export const options = { vus: 50, duration: '3m' };
const url = __ENV.GRAPHQL_URL;
const jwt = __ENV.JWT;
export default function () {
  const payload = JSON.stringify({
    query: 'query($t:ID!){ tenantCoherence(tenantId:$t){ score status updatedAt } }',
    variables: { t: 'tenant-123' }
  });
  const res = http.post(url, payload, { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` } });
  check(res, { '200': (r) => r.status === 200 });
}