// k6 Performance Baseline — IntelGraph v5.0.0
//
// Usage:
//   k6 run tests/performance/k6-baseline.js --env BASE_URL=http://localhost:4000
//
// This script records performance baselines for the GA gate.
// Thresholds are enforced in CI via the performance-gate workflow.

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const graphqlLatency = new Trend('graphql_latency', true);
const searchLatency = new Trend('search_latency', true);
const ingestLatency = new Trend('ingest_latency', true);
const traversalLatency = new Trend('traversal_latency', true);
const entityOps = new Counter('entity_operations');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';
const TOKEN = __ENV.AUTH_TOKEN || 'perf-test-token';
const TENANT = __ENV.TENANT_ID || 'perf-tenant';

export const options = {
  stages: [
    // Ramp-up
    { duration: '1m', target: 10 },
    // Steady state
    { duration: '5m', target: 50 },
    // Spike (3x)
    { duration: '2m', target: 150 },
    // Recovery
    { duration: '2m', target: 50 },
    // Ramp-down
    { duration: '1m', target: 0 },
  ],

  thresholds: {
    // SLO: 99.5% of requests succeed
    errors: ['rate<0.005'],

    // SLO: p99 latency < 500ms for GraphQL
    graphql_latency: ['p(99)<500'],

    // SLO: p99 latency < 300ms for search
    search_latency: ['p(99)<300'],

    // SLO: p99 latency < 500ms for ingest
    ingest_latency: ['p(99)<500'],

    // SLO: p99 latency < 2000ms for 2-hop traversals
    traversal_latency: ['p(99)<2000'],

    // Overall HTTP metrics
    http_req_duration: ['p(95)<1000', 'p(99)<2000'],
    http_req_failed: ['rate<0.01'],
  },
};

const headers = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${TOKEN}`,
  'X-Tenant-ID': TENANT,
};

export default function () {
  group('Health Check', () => {
    const res = http.get(`${BASE_URL}/health/ready`);
    check(res, {
      'health status 200': (r) => r.status === 200,
    });
    errorRate.add(res.status !== 200);
  });

  group('GraphQL - Entity Query', () => {
    const payload = JSON.stringify({
      query: `query { entities(first: 10, filter: { type: PERSON }) {
        edges { node { id name type createdAt } }
        pageInfo { hasNextPage endCursor }
      }}`,
    });

    const res = http.post(`${BASE_URL}/graphql`, payload, { headers });
    graphqlLatency.add(res.timings.duration);
    entityOps.add(1);
    check(res, {
      'graphql status 200': (r) => r.status === 200,
      'graphql no errors': (r) => {
        const body = r.json();
        return !body.errors || body.errors.length === 0;
      },
    });
    errorRate.add(res.status !== 200);
  });

  group('GraphQL - 1-hop Traversal', () => {
    const payload = JSON.stringify({
      query: `query {
        entity(id: "perf-seed-entity-1") {
          relationships(depth: 1) {
            edges { node { id type name } }
          }
        }
      }`,
    });

    const res = http.post(`${BASE_URL}/graphql`, payload, { headers });
    traversalLatency.add(res.timings.duration);
    check(res, {
      'traversal status 200': (r) => r.status === 200,
    });
    errorRate.add(res.status !== 200);
  });

  group('GraphQL - 2-hop Traversal', () => {
    const payload = JSON.stringify({
      query: `query {
        entity(id: "perf-seed-entity-1") {
          relationships(depth: 2, filter: { types: [AFFILIATED_WITH, LOCATED_AT] }) {
            edges { node { id name } }
          }
        }
      }`,
    });

    const res = http.post(`${BASE_URL}/graphql`, payload, { headers });
    traversalLatency.add(res.timings.duration);
    check(res, {
      '2-hop status 200': (r) => r.status === 200,
    });
    errorRate.add(res.status !== 200);
  });

  group('Search Query', () => {
    const payload = JSON.stringify({
      q: 'intelligence analysis',
      limit: 20,
    });

    const res = http.post(`${BASE_URL}/search/query`, payload, { headers });
    searchLatency.add(res.timings.duration);
    check(res, {
      'search status 200': (r) => r.status === 200,
    });
    errorRate.add(res.status !== 200);
  });

  group('Ingest Event', () => {
    const payload = JSON.stringify({
      source: 'k6-perf-test',
      type: 'PERF_EVENT',
      data: {
        name: `perf-entity-${Date.now()}`,
        timestamp: new Date().toISOString(),
      },
    });

    const res = http.post(`${BASE_URL}/ingest/events`, payload, { headers });
    ingestLatency.add(res.timings.duration);
    check(res, {
      'ingest status 202': (r) => r.status === 202,
    });
    errorRate.add(res.status !== 202);
  });

  sleep(1);
}

export function handleSummary(data) {
  const summary = {
    version: '5.0.0',
    timestamp: new Date().toISOString(),
    vus_max: data.metrics.vus_max ? data.metrics.vus_max.values.max : 0,
    iterations: data.metrics.iterations ? data.metrics.iterations.values.count : 0,
    duration_s: data.state ? data.state.testRunDurationMs / 1000 : 0,
    thresholds_passed: Object.values(data.metrics).every(
      (m) => !m.thresholds || Object.values(m.thresholds).every((t) => t.ok)
    ),
    metrics: {
      http_req_duration: {
        p50: data.metrics.http_req_duration?.values['p(50)'],
        p95: data.metrics.http_req_duration?.values['p(95)'],
        p99: data.metrics.http_req_duration?.values['p(99)'],
        avg: data.metrics.http_req_duration?.values.avg,
      },
      graphql_latency: {
        p50: data.metrics.graphql_latency?.values['p(50)'],
        p95: data.metrics.graphql_latency?.values['p(95)'],
        p99: data.metrics.graphql_latency?.values['p(99)'],
      },
      search_latency: {
        p50: data.metrics.search_latency?.values['p(50)'],
        p95: data.metrics.search_latency?.values['p(95)'],
        p99: data.metrics.search_latency?.values['p(99)'],
      },
      traversal_latency: {
        p50: data.metrics.traversal_latency?.values['p(50)'],
        p95: data.metrics.traversal_latency?.values['p(95)'],
        p99: data.metrics.traversal_latency?.values['p(99)'],
      },
      error_rate: data.metrics.errors?.values.rate,
      entity_operations: data.metrics.entity_operations?.values.count,
    },
    headroom: '≥20% required for GA gate',
  };

  return {
    'artifacts/perf/baseline-summary.json': JSON.stringify(summary, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, opts) {
  // k6 built-in summary — returned to stdout
  return '';
}
