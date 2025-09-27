import http from 'k6/http';
import { check, group, sleep } from 'k6';

export const options = {
  scenarios: {
    maestro_parallel_load: {
      executor: 'constant-arrival-rate',
      rate: 120,
      timeUnit: '1s',
      duration: '1m',
      preAllocatedVUs: 50,
      maxVUs: 200,
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1200'],
    http_req_failed: ['rate<0.01'],
  },
};

const jwt = __ENV.WORKFLOW_ENGINE_JWT || 'test-token';
const baseUrl = __ENV.WORKFLOW_ENGINE_BASE_URL || 'http://localhost:4005';

export default function maestroLoadTest() {
  group('execute workflow', () => {
    const payload = JSON.stringify({
      triggerData: { build: 'nightly', releaseTrain: 'v24.4.0' },
      persona: { mode: 'expedited' },
    });

    const res = http.post(`${baseUrl}/api/workflows/demo-workflow/execute`, payload, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
    });

    check(res, {
      'status is 201': (r) => r.status === 201,
      'has execution id': (r) => !!(r.json() || {}).id,
    });
  });

  group('retry execution', () => {
    const retryPayload = JSON.stringify({
      nodeId: 'maestro-dag-verify',
      restartSuccessful: false,
      persona: { mode: 'standard' },
    });

    const res = http.post(`${baseUrl}/api/executions/sample-exec/retry`, retryPayload, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
    });

    check(res, {
      'retry accepted': (r) => r.status === 200 || r.status === 202,
    });
  });

  sleep(0.2);
}
