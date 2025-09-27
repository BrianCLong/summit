import http from 'k6/http';
import { check } from 'k6';
export const options = { vus: 20, duration: '3m' };
const url = __ENV.GRAPHQL_URL;
const jwt = __ENV.JWT;
export default function () {
  const payload = JSON.stringify({
    query: 'mutation($input:PublishCoherenceSignalInput!){ publishCoherenceSignal(input:$input) }',
    variables: { input: { tenantId: 'tenant-123', type: 'k6', value: Math.random(), source: 'k6', ts: new Date().toISOString() } }
  });
  const res = http.post(url, payload, { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` } });
  check(res, { '200': (r) => r.status === 200 });
}
