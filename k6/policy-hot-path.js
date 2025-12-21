import http from 'k6/http';
import { sleep, check } from 'k6';

export const options = { vus: 5, duration: '30s', thresholds: { http_req_duration: ['p(95)<500'] } };

export default function () {
  const payload = JSON.stringify({ action: 'export:bundle', resource: 'case:stress', attributes: { purpose: 'press', labels: ['public'], sensitivity: 'S1' } });
  const res = http.post('http://localhost:4000/policy/explain', payload, { headers: { 'Content-Type': 'application/json' } });
  check(res, { 'status 200': r => r.status === 200, 'decision present': r => r.json('reason') !== undefined });
  sleep(1);
}
