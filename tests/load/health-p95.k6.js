import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    steady_health_probe: {
      executor: 'ramping-arrival-rate',
      startRate: 10,
      timeUnit: '1s',
      preAllocatedVUs: 50,
      stages: [
        { target: 20, duration: '1m' },
        { target: 50, duration: '3m' },
        { target: 0, duration: '1m' }
      ]
    }
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<400']
  },
  summaryTrendStats: ['avg', 'p(95)', 'p(99)', 'min', 'max']
};

const API_URL = __ENV.API_URL ?? 'http://localhost:4000/health';
const SLEEP = Number(__ENV.HEALTH_PAUSE ?? 0.5);

export function handleSummary(data) {
  return {
    'tests/load/output/health-p95-summary.json': JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        apiUrl: API_URL,
        http_req_duration: data.metrics.http_req_duration,
        http_req_failed: data.metrics.http_req_failed
      },
      null,
      2
    )
  };
}

export default function () {
  const res = http.get(API_URL);
  const ok = check(res, {
    'status is 200': (r) => r.status === 200,
    'response time p95 < 400ms': (r) => r.timings.duration < 400
  });

  if (!ok) {
    console.error(`Health probe failed with status ${res.status}`);
  }

  sleep(SLEEP);
}
