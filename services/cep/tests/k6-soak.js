import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 10,
  duration: '30s'
};

export default function () {
  const res = http.post('http://localhost:4100/dryrun', JSON.stringify({
    rule: 'AFTER login WITHIN 30s purchase WINDOW TUMBLING 1m',
    events: [
      { name: 'login', timestamp: Date.now() },
      { name: 'purchase', timestamp: Date.now() + 5000 }
    ]
  }), { headers: { 'Content-Type': 'application/json' } });
  check(res, { 'status 200': (r) => r.status === 200 });
  sleep(1);
}
