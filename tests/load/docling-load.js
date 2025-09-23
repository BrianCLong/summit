import http from 'k6/http';
import { check, sleep } from 'k6';
import encoding from 'k6/encoding';

export const options = {
  vus: 20,
  duration: '2m',
  thresholds: {
    http_req_duration: ['p(95)<900'],
    http_req_failed: ['rate<0.001'],
  },
};

const BASE_URL = __ENV.DOCLING_URL || 'http://localhost:7100';

function buildPayload() {
  return JSON.stringify({
    requestId: `load-${Math.random().toString(36).slice(2)}`,
    tenantId: 'load-test',
    purpose: 'investigation',
    retention: 'short',
    contentType: 'text/plain',
    bytes: encoding.b64encode('Load test log entry ERROR something failed'),
  });
}

export default function () {
  const res = http.post(`${BASE_URL}/v1/parse`, buildPayload(), {
    headers: { 'Content-Type': 'application/json' },
  });
  check(res, {
    'status is 200': (r) => r.status === 200,
    'has fragments': (r) => (r.json()?.result?.fragments || []).length > 0,
  });
  sleep(1);
}
