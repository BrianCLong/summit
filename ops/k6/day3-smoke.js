import http from 'k6/http';
import { sleep, check } from 'k6';

export const options = { vus: 10, duration: '30s', thresholds: {
  http_req_duration: ['p(95)<500'],
  checks: ['rate>0.95'],
}};

export default function () {
  const headers = { headers: { 'idempotency-key': `${__VU}-${__ITER}` } };
  check(http.get(`${__ENV.LAC}/healthz`), { 'lac 200': (r) => r.status === 200 });
  check(
    http.post(
      `${__ENV.PLEDGER}/claim`,
      JSON.stringify({ evidenceId: 'ev', assertion: 'ok' }),
      headers,
    ),
    { 'claim 201': (r) => r.status === 201 },
  );
  sleep(1);
}
