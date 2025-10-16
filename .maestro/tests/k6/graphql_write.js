import http from 'k6/http';
import { check } from 'k6';

// SLO: GraphQL writes p95 ≤ 700ms, availability 99.9%
export const options = {
  vus: 20,
  duration: '3m',
  thresholds: {
    http_req_duration: ['p(95)<700'], // p95 must be under 700ms
    http_req_failed: ['rate<0.001'], // 99.9% availability (0.1% error rate)
    checks: ['rate>0.99'], // 99% of checks must pass
  },
};

const url = __ENV.GRAPHQL_URL || 'http://localhost:4000/graphql';
const jwt = __ENV.JWT || 'test-token';

// Use persisted query hash instead of full mutation
const persistedMutationHash =
  'f62e45c84c814268c222a14707625d5a0d94939ff450701bce5bfcaba608e7db';

export default function () {
  const payload = JSON.stringify({
    id: persistedMutationHash,
    variables: {
      input: {
        tenantId: 'tenant-123',
        type: 'k6-load-test',
        value: Math.random(),
        weight: 1.0,
        source: 'k6-perf-test',
        ts: new Date().toISOString(),
      },
    },
  });

  const res = http.post(url, payload, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwt}`,
      'x-tenant-id': 'tenant-123', // Add tenant context for tracing
    },
    tags: { operation: 'write' }, // Tag for metrics
  });

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response has data': (r) => r.json().data !== undefined,
    'mutation succeeded': (r) => r.json().data?.publishCoherenceSignal === true,
  });
}
