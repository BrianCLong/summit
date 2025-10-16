import http from 'k6/http';
import { check } from 'k6';
export default function () {
  check(http.get(`${__ENV.BASE}/api/relay/poll`), {
    'poll 200/4xx': (r) => [200, 400, 401].includes(r.status),
  });
  check(
    http.get(
      `${__ENV.BASE}/api/ops/capacity?tenant=acme&from=2025-09-01&to=2025-09-07`,
    ),
    { 'capacity 200': (r) => r.status === 200 },
  );
  check(http.get(`${__ENV.BASE}/api/sites/stream`), {
    'sse 200': (r) => r.status === 200,
  });
}
