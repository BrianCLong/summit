import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 10,
  duration: '1m',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<700', 'p(99)<1500'],
  },
};

export default function () {
  const res = http.get(__ENV.TARGET_URL);
  check(res, {
    'status is 2xx/3xx': (r) => r.status >= 200 && r.status < 400,
  });
  sleep(1);
}
