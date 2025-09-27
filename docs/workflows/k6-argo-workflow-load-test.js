import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

const workflowSubmissionDuration = new Trend('workflow_submission_duration');
const workflowStatusDuration = new Trend('workflow_status_duration');
const workflowErrors = new Rate('workflow_errors');
const workflowRetries = new Counter('workflow_retries');

const BASE_URL = __ENV.ARGO_BASE_URL || 'http://localhost:2746';
const WORKFLOW_TEMPLATE = __ENV.WORKFLOW_TEMPLATE || 'stress-test-dag';
const TOKEN = __ENV.ARGO_TOKEN || '';
const MAX_STATUS_POLLS = Number(__ENV.MAX_STATUS_POLLS || 120);
const STATUS_POLL_INTERVAL = Number(__ENV.STATUS_POLL_INTERVAL || 5);
const MAX_RETRIES = Number(__ENV.MAX_RETRIES || 3);

export const options = {
  scenarios: {
    submit_and_watch: {
      executor: 'ramping-arrival-rate',
      startRate: Number(__ENV.START_RATE || 5),
      stages: JSON.parse(
        __ENV.STAGES ||
          JSON.stringify([
            { target: 20, duration: '2m' },
            { target: 60, duration: '5m' },
            { target: 0, duration: '1m' },
          ]),
      ),
      preAllocatedVUs: Number(__ENV.PREALLOCATED_VUS || 100),
      maxVUs: Number(__ENV.MAX_VUS || 500),
      exec: 'submitAndWatchWorkflow',
    },
  },
  thresholds: {
    workflow_errors: ['rate<0.05'],
    http_req_duration: ['p(95)<2000', 'avg<1000'],
    workflow_submission_duration: ['p(95)<1500'],
    workflow_status_duration: ['p(95)<30000'],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
  setupTimeout: '5m',
};

function authHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (TOKEN) {
    headers.Authorization = `Bearer ${TOKEN}`;
  }
  return headers;
}

function submitWorkflow() {
  const payload = JSON.stringify({
    namespace: __ENV.ARGO_NAMESPACE || 'argo',
    resourceKind: 'Workflow',
    resourceName: WORKFLOW_TEMPLATE,
  });

  const res = http.post(
    `${BASE_URL}/api/v1/workflows/${__ENV.ARGO_NAMESPACE || 'argo'}/submit`,
    payload,
    { headers: authHeaders(), tags: { name: 'workflow_submit' } },
  );

  workflowSubmissionDuration.add(res.timings.duration);

  const ok = check(res, {
    'submitted workflow successfully': (r) => r.status === 200,
  });

  if (!ok) {
    workflowErrors.add(1);
    return null;
  }

  const responseBody = res.json();
  return responseBody && responseBody.metadata && responseBody.metadata.name
    ? responseBody.metadata.name
    : null;
}

function getWorkflowStatus(name) {
  let attempt = 0;
  const namespace = __ENV.ARGO_NAMESPACE || 'argo';
  const url = `${BASE_URL}/api/v1/workflows/${namespace}/${name}`;
  let statusResponse;

  while (attempt < MAX_STATUS_POLLS) {
    statusResponse = http.get(url, {
      headers: authHeaders(),
      tags: { name: 'workflow_status' },
    });

    workflowStatusDuration.add(statusResponse.timings.duration);

    if (statusResponse.status !== 200) {
      workflowErrors.add(1);
      attempt += 1;
      workflowRetries.add(1);
      sleep(STATUS_POLL_INTERVAL);
      continue;
    }

    const phase = statusResponse.json('status.phase');
    if (phase === 'Succeeded' || phase === 'Failed' || phase === 'Error') {
      return phase;
    }

    attempt += 1;
    sleep(STATUS_POLL_INTERVAL);
  }

  return 'Timeout';
}

export function setup() {
  if (!TOKEN) {
    console.warn('Running without authentication token; ensure Argo API allows anonymous access.');
  }
}

export function submitAndWatchWorkflow() {
  let attempt = 0;
  let workflowName;

  while (attempt < MAX_RETRIES && !workflowName) {
    workflowName = submitWorkflow();
    if (workflowName) {
      break;
    }
    attempt += 1;
    workflowRetries.add(1);
    sleep(1);
  }

  if (!workflowName) {
    workflowErrors.add(1);
    return;
  }

  const phase = getWorkflowStatus(workflowName);

  check(phase, {
    'workflow completed successfully': (p) => p === 'Succeeded',
  }) || workflowErrors.add(1);

  sleep(Number(__ENV.PAUSE_BETWEEN_WORKFLOWS || 1));
}
