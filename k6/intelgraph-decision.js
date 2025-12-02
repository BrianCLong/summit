import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 }, // Ramp up to 20 users
    { duration: '1m', target: 20 },  // Stay at 20 users
    { duration: '30s', target: 0 },  // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<300'], // p95 latency must be < 300ms
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  const payload = JSON.stringify({
    tenantId: 'tenant-123',
    outcome: 'APPROVED',
    rationale: 'Performance test decision',
    confidenceScore: 0.99,
    actorId: 'user-perf',
    classification: 'INTERNAL',
    claimIds: ['claim-abc', 'claim-def']
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-token' // Replace with valid token in actual run
    },
  };

  const res = http.post(`${BASE_URL}/api/intelgraph/decisions`, payload, params);

  check(res, {
    'is status 201': (r) => r.status === 201,
    'has receipt': (r) => r.json('receipt') !== undefined,
    'has ledger hash': (r) => r.json('receipt').ledgerEntryHash !== undefined,
  });

  sleep(1);
}
