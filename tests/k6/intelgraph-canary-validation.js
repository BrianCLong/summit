import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const stableUrl = __ENV.STABLE_URL || 'http://conductor-active:8000/health';
const canaryUrl = __ENV.CANARY_URL || 'http://conductor-preview:8000/health';
const canaryWeight = Number(__ENV.CANARY_WEIGHT || 0.1);
const sleepSeconds = Number(__ENV.SLEEP_SECONDS || 1);

const canarySuccess = new Rate('canary_success');
const stableSuccess = new Rate('stable_success');
const canaryDuration = new Trend('canary_http_duration');
const stableDuration = new Trend('stable_http_duration');

export const options = {
  scenarios: {
    mixed_traffic: {
      executor: 'constant-arrival-rate',
      duration: __ENV.TEST_DURATION || '5m',
      rate: Number(__ENV.REQUEST_RATE || 30),
      preAllocatedVUs: Number(__ENV.VUS || 20),
      timeUnit: '1s'
    }
  },
  thresholds: {
    canary_success: ['rate>0.95'],
    stable_success: ['rate>0.98'],
    canary_http_duration: ['p(95)<2000'],
    stable_http_duration: ['p(95)<1500'],
    http_req_failed: ['rate<0.05']
  }
};

export default function () {
  const useCanary = Math.random() < canaryWeight;
  const targetUrl = useCanary ? canaryUrl : stableUrl;
  const res = http.get(targetUrl, { tags: { deployment: useCanary ? 'canary' : 'stable' } });

  const healthy = check(res, {
    'status is 2xx/3xx': (r) => r.status >= 200 && r.status < 400,
  });

  if (useCanary) {
    canarySuccess.add(healthy);
    canaryDuration.add(res.timings.duration);
  } else {
    stableSuccess.add(healthy);
    stableDuration.add(res.timings.duration);
  }

  sleep(sleepSeconds);
}
