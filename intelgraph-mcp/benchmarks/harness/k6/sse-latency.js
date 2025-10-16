import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 50,
  duration: '2m',
  thresholds: {
    http_req_duration: ['p(95)<250'],
  },
};

export default function () {
  const res = http.get(`${__ENV.ENDPOINT}/v1/stream/test`, {
    headers: {
      Authorization: `Bearer ${__ENV.TOKEN}`,
    },
  });
  check(res, {
    'status 200': (r) => r.status === 200,
    'is sse': (r) =>
      String(r.headers['Content-Type'] || '').includes('text/event-stream'),
  });
  sleep(0.05);
}
