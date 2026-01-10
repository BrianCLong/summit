import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';

const startCaseDuration = new Trend('case_start_duration_ms', true);
const approveRequestDuration = new Trend('case_approval_request_duration_ms', true);
const approveVoteDuration = new Trend('case_approval_vote_duration_ms', true);
const exportDuration = new Trend('case_export_duration_ms', true);
const cancelDuration = new Trend('case_cancel_duration_ms', true);

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';
const TENANT_ID = __ENV.TENANT_ID || 'perf-tenant';
const USER_ID = __ENV.USER_ID || 'perf-user';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';
const LEGAL_BASIS = __ENV.LEGAL_BASIS || 'investigation';

const defaultHeaders = {
  'Content-Type': 'application/json',
  'x-tenant-id': TENANT_ID,
  'x-user-id': USER_ID,
};

if (AUTH_TOKEN) {
  defaultHeaders.Authorization = `Bearer ${AUTH_TOKEN}`;
}

export const options = {
  scenarios: {
    case_ops_flow: {
      executor: 'per-vu-iterations',
      vus: Number(__ENV.VUS || 5),
      iterations: Number(__ENV.ITERATIONS || 5),
      maxDuration: __ENV.MAX_DURATION || '5m',
      tags: { scenario: 'case_ops_flow' },
    },
  },
  thresholds: {
    'case_start_duration_ms': ['p(95)<800', 'p(99)<1200'],
    'case_approval_request_duration_ms': ['p(95)<800', 'p(99)<1200'],
    'case_approval_vote_duration_ms': ['p(95)<800', 'p(99)<1200'],
    'case_export_duration_ms': ['p(95)<1500', 'p(99)<2000'],
    'case_cancel_duration_ms': ['p(95)<800', 'p(99)<1200'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const caseId = createCase();
  if (!caseId) {
    sleep(1);
    return;
  }

  const approvalId = requestApproval(caseId);
  if (approvalId) {
    submitApprovalVote(approvalId);
  }

  exportCase(caseId);
  cancelCase(caseId);

  sleep(1);
}

function createCase() {
  const payload = JSON.stringify({
    title: `Perf Case ${__VU}-${__ITER}-${Date.now()}`,
    description: 'Perf harness case flow',
    status: 'open',
    compartment: 'unclassified',
    policyLabels: ['perf'],
    metadata: { source: 'k6' },
    reason: 'Performance harness - start case',
    legalBasis: LEGAL_BASIS,
  });

  const res = http.post(`${BASE_URL}/api/cases`, payload, {
    headers: defaultHeaders,
    tags: { step: 'start_case' },
  });

  startCaseDuration.add(res.timings.duration);

  const ok = check(res, {
    'start case status 201': (r) => r.status === 201,
    'start case returns id': (r) => Boolean(r.json('id')),
  });

  if (!ok) {
    return null;
  }

  return res.json('id');
}

function requestApproval(caseId) {
  const payload = JSON.stringify({
    approvalType: 'n-eyes',
    requiredApprovers: 1,
    reason: 'Performance harness - approval request',
    metadata: { source: 'k6' },
  });

  const res = http.post(`${BASE_URL}/api/cases/${caseId}/approvals`, payload, {
    headers: defaultHeaders,
    tags: { step: 'request_approval' },
  });

  approveRequestDuration.add(res.timings.duration);

  const ok = check(res, {
    'approval request status 201': (r) => r.status === 201,
    'approval request returns id': (r) => Boolean(r.json('id')),
  });

  if (!ok) {
    return null;
  }

  return res.json('id');
}

function submitApprovalVote(approvalId) {
  const payload = JSON.stringify({
    decision: 'approve',
    reason: 'Performance harness - approval vote',
    metadata: { source: 'k6' },
  });

  const res = http.post(`${BASE_URL}/api/approvals/${approvalId}/vote`, payload, {
    headers: defaultHeaders,
    tags: { step: 'approve' },
  });

  approveVoteDuration.add(res.timings.duration);

  check(res, {
    'approval vote status 201': (r) => r.status === 201,
  });
}

function exportCase(caseId) {
  const payload = JSON.stringify({
    reason: 'Performance harness - export case',
    legalBasis: LEGAL_BASIS,
  });

  const res = http.post(`${BASE_URL}/api/cases/${caseId}/export`, payload, {
    headers: defaultHeaders,
    tags: { step: 'export_case' },
  });

  exportDuration.add(res.timings.duration);

  check(res, {
    'export case status 200': (r) => r.status === 200,
  });
}

function cancelCase(caseId) {
  const payload = JSON.stringify({
    reason: 'Performance harness - cancel case',
    legalBasis: LEGAL_BASIS,
  });

  const res = http.post(`${BASE_URL}/api/cases/${caseId}/archive`, payload, {
    headers: defaultHeaders,
    tags: { step: 'cancel_case' },
  });

  cancelDuration.add(res.timings.duration);

  check(res, {
    'cancel case status 200': (r) => r.status === 200,
  });
}

function metricEntry(data, name) {
  const metric = data.metrics[name];
  if (!metric || !metric.values) {
    return { p95_ms: null, p99_ms: null };
  }

  return {
    p95_ms: metric.values['p(95)'],
    p99_ms: metric.values['p(99)'],
  };
}

export function handleSummary(data) {
  const baseline = {
    suite: 'case-ops-flow',
    generated_at: new Date().toISOString(),
    source: 'k6',
    status: 'captured',
    environment: {
      base_url: BASE_URL,
      tenant_id: TENANT_ID,
      user_id: USER_ID,
      legal_basis: LEGAL_BASIS,
    },
    metrics: {
      case_start_duration_ms: metricEntry(data, 'case_start_duration_ms'),
      case_approval_request_duration_ms: metricEntry(
        data,
        'case_approval_request_duration_ms'
      ),
      case_approval_vote_duration_ms: metricEntry(
        data,
        'case_approval_vote_duration_ms'
      ),
      case_export_duration_ms: metricEntry(data, 'case_export_duration_ms'),
      case_cancel_duration_ms: metricEntry(data, 'case_cancel_duration_ms'),
    },
  };

  return {
    'perf/baselines/case-ops-flow-baseline.json': JSON.stringify(baseline, null, 2),
  };
}
