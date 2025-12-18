/*
 * k6 scenario to validate ingest gate throughput and certificate enforcement.
 * Execute with: k6 run ingestion/contracts/tests/k6-ingest-gate.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 10,
  duration: '30s',
};

const payload = JSON.stringify({
  deviceId: 'perf-1',
  temperatureC: 21.5,
  timestamp: new Date().toISOString(),
});

export default function run() {
  const res = http.post('http://localhost:8787/ingest/dpic-telemetry', payload, {
    headers: {
      'Content-Type': 'application/json',
      'X-DPIC-Cert': __ENV.DPIC_CERT || 'missing',
    },
  });
  check(res, {
    'status is 200 or 412': (r) => r.status === 200 || r.status === 412,
  });
  sleep(0.25);
}
