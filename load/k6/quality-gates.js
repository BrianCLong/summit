import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';

const latencyP95 = new Trend('quality_gate_latency', true);

export const options = {
  scenarios: {
    release_validation: {
      executor: 'constant-arrival-rate',
      rate: 60,
      timeUnit: '1s',
      duration: '3m',
      preAllocatedVUs: 30,
      maxVUs: 120
    }
  },
  thresholds: {
    quality_gate_latency: ['p(95)<450'],
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<450', 'p(99)<650']
  }
};

export function setup() {
  return {
    baseUrl: __ENV.BASE_URL || 'http://localhost:3000',
    healthPath: __ENV.HEALTH_PATH || '/healthz'
  };
}

export default function qualityGateScenario(data) {
  const response = http.get(`${data.baseUrl}${data.healthPath}`);
  latencyP95.add(response.timings.duration);

  check(response, {
    'health endpoint responds quickly': (res) => res.timings.duration < 450,
    'health endpoint is successful': (res) => res.status === 200
  });

  sleep(1);
}
