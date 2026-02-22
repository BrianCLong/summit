import http from 'k6/http';
import { check } from 'k6';

export default function () {
  const base = __ENV.BASE || 'http://localhost:4000';
  const res = http.get(`${base}/healthz`, {
    headers: { 'x-spiffe': 'spiffe://intelgraph/ns/intelgraph/sa/maestro' },
  });
  check(res, { '200 ok': (r) => r.status === 200 });
}
