import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '30s', target: 50 }, // Ramp up to 50 concurrent users
    { duration: '1m', target: 50 },  // Sustain
    { duration: '30s', target: 0 },  // Ramp down
  ],
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  const payload = JSON.stringify({
    eventType: 'load_test_event',
    payload: {
      userId: `user-${__VU}-${__ITER}`,
      timestamp: new Date().toISOString(),
      data: 'x'.repeat(1024) // 1KB payload
    }
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-id': 'load-test-tenant'
    },
  };

  const res = http.post(`${BASE_URL}/api/webhooks/trigger-test`, payload, params);

  check(res, {
    'status is 200': (r) => r.status === 200,
  });

  sleep(0.1);
}
