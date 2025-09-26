import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

const routerUrl = __ENV.ROUTER_URL;
const stableUrl = __ENV.STABLE_URL || 'http://conductor-active:8000';
const canaryUrl = __ENV.CANARY_URL || 'http://conductor-preview:8000';
const requestPath = __ENV.REQUEST_PATH || '/health';
const requestRate = Number(__ENV.REQUEST_RATE || 20);
const vus = Number(__ENV.VUS || 15);
const duration = __ENV.TEST_DURATION || '5m';
const iterationSleep = Number(__ENV.SLEEP_SECONDS || 1);
const canaryTrafficFraction = Number(__ENV.CANARY_TRAFFIC_FRACTION || 0.1);
const routerHeader = __ENV.ROUTER_HEADER || 'x-rollouts-route';
const stableHeaderValue = __ENV.STABLE_HEADER_VALUE || 'stable';
const canaryHeaderValue = __ENV.CANARY_HEADER_VALUE || 'canary';

const totalRequests = new Counter('rollout_requests_total');
const canarySuccessRate = new Rate('rollout_canary_success_rate');
const canaryErrorRate = new Rate('rollout_canary_error_rate');
const canaryLatency = new Trend('rollout_canary_latency');
const stableSuccessRate = new Rate('rollout_stable_success_rate');
const stableErrorRate = new Rate('rollout_stable_error_rate');
const stableLatency = new Trend('rollout_stable_latency');

function buildRequestTarget(useCanary) {
  if (routerUrl) {
    return {
      url: `${routerUrl}${requestPath}`,
      params: {
        headers: {
          [routerHeader]: useCanary ? canaryHeaderValue : stableHeaderValue,
        },
        tags: {
          deployment: useCanary ? 'canary' : 'stable',
        },
      },
    };
  }

  const base = useCanary ? canaryUrl : stableUrl;
  return {
    url: `${base}${requestPath}`,
    params: {
      tags: {
        deployment: useCanary ? 'canary' : 'stable',
      },
    },
  };
}

export const options = {
  scenarios: {
    rollout_mix: {
      executor: 'constant-arrival-rate',
      duration,
      rate: requestRate,
      preAllocatedVUs: vus,
      timeUnit: '1s',
    },
  },
  thresholds: {
    rollout_canary_success_rate: ['rate>=0.95'],
    rollout_canary_error_rate: ['rate<=0.05'],
    rollout_canary_latency: ['p(95)<2000'],
    'http_req_failed{deployment:canary}': ['rate<=0.05'],
    'http_req_duration{deployment:canary}': ['p(95)<2000'],
  },
};

export default function rolloutCanary() {
  const useCanary = Math.random() < canaryTrafficFraction;
  const target = buildRequestTarget(useCanary);
  const response = http.get(target.url, target.params);

  totalRequests.add(1);

  const isSuccess = response.status >= 200 && response.status < 400;
  const isError = response.status >= 500;

  check(response, {
    'status is acceptable': () => isSuccess,
  });

  if (useCanary) {
    canarySuccessRate.add(isSuccess);
    canaryErrorRate.add(isError);
    canaryLatency.add(response.timings.duration);
  } else {
    stableSuccessRate.add(isSuccess);
    stableErrorRate.add(isError);
    stableLatency.add(response.timings.duration);
  }

  sleep(iterationSleep);
}
