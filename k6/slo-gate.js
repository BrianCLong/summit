/**
 * SLO Gate - CI/CD Guardrail
 *
 * Validates Service Level Objectives (SLOs) for the Summit platform
 * Used in CI to block regressions.
 *
 * Thresholds:
 * - p95 Latency < 1.5s
 * - Error Rate < 1%
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const responseTimeTrend = new Trend('response_time', true);

// Configuration
export const options = {
  // SLO thresholds - fail the test if these aren't met
  thresholds: {
    // p95 response time must be under 1500ms (1.5s)
    'http_req_duration{expected_response:true}': ['p(95)<1500'],

    // Error rate must be under 1%
    http_req_failed: ['rate<0.01'],

    // 95% of checks must pass
    checks: ['rate>0.95'],
  },

  // Load profile for CI (Fast but sufficient for statistical significance)
  stages: [
    { duration: '5s', target: 5 },  // Ramp up
    { duration: '15s', target: 20 }, // Steady load
    { duration: '5s', target: 0 },  // Ramp down
  ],
};

// Environment configuration
const BASE_URL = __ENV.TARGET || __ENV.BASE_URL || 'http://localhost:4000';

export default function () {
  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': 'k6-slo-gate/1.0',
  };

  // 1. Health check (baseline)
  let response = http.get(`${BASE_URL}/health`, { headers, tags: { endpoint: 'health' } });
  check(response, { 'Health 200': (r) => r.status === 200 });

  // 2. GraphQL Query (Simulate load)
  // Simple query to stress the API slightly
  const graphqlQuery = {
    query: `
      query HealthQuery {
        __schema {
          queryType {
            name
          }
        }
      }
    `,
  };

  response = http.post(`${BASE_URL}/graphql`, JSON.stringify(graphqlQuery), {
    headers: { ...headers, 'Content-Type': 'application/json' },
    tags: { endpoint: 'graphql' },
  });

  const graphqlCheck = check(response, {
    'GraphQL 200': (r) => r.status === 200,
    'Latency < 1.5s': (r) => r.timings.duration < 1500,
  });

  if (!graphqlCheck) {
      errorRate.add(1);
  } else {
      errorRate.add(0);
  }
  responseTimeTrend.add(response.timings.duration);

  sleep(0.5);
}

export function handleSummary(data) {
  // Output JSON for badge generation
  const summary = {};

  if (__ENV.OUTPUT_JSON) {
      const p95 = data.metrics.http_req_duration ? data.metrics.http_req_duration.values['p(95)'] : 0;
      const errRate = data.metrics.http_req_failed ? data.metrics.http_req_failed.values.rate : 0;

      summary['slo-results.json'] = JSON.stringify({
          p95_latency: p95,
          error_rate: errRate,
          status: (p95 < 1500 && errRate < 0.01) ? 'passing' : 'failing',
          timestamp: new Date().toISOString()
      });
  }

  // Console output
  console.log('--------------------------------------------------');
  console.log('Summit SLO Gate Results');
  console.log(`p95 Latency: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms (Limit: 1500ms)`);
  console.log(`Error Rate: ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}% (Limit: 1%)`);
  console.log('--------------------------------------------------');

  return summary;
}
