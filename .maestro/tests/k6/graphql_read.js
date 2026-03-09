import http from 'k6/http';
import { check } from 'k6';

// SLO: GraphQL reads p95 ≤ 350ms, availability 99.9%
export const options = {
  vus: 50,
  duration: '3m',
  thresholds: {
    http_req_duration: ['p(95)<350'], // p95 must be under 350ms
    http_req_failed: ['rate<0.001'], // 99.9% availability (0.1% error rate)
    checks: ['rate>0.99'], // 99% of checks must pass
  },
};

const url = __ENV.GRAPHQL_URL || 'http://localhost:4000/graphql';
const jwt = __ENV.JWT || 'test-token';

// Use persisted query hash instead of full query
const persistedQueryHash =
  'dba7e57dd8f332f9d5d51278fe216c60ce206fc95e1067b790cc2893376cbbea';

export default function () {
  const payload = JSON.stringify({
    id: persistedQueryHash,
    variables: { tenantId: 'tenant-123' },
  });

  const res = http.post(url, payload, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwt}`,
      'x-tenant-id': 'tenant-123', // Add tenant context for tracing
    },
    tags: { operation: 'read' }, // Tag for metrics
  });

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response has data': (r) => r.json().data !== undefined,
    'coherence score returned': (r) =>
      r.json().data?.tenantCoherence?.score !== undefined,
  });
}
