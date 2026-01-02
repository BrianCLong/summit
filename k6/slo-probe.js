/**
 * SLO Probe - Performance Validation Script
 *
 * Validates Service Level Objectives (SLOs) for the IntelGraph platform
 * Runs quick performance checks against key endpoints
 *
 * Usage:
 *   k6 run k6/slo-probe.js
 *   k6 run k6/slo-probe.js --vus 50 --duration 60s
 *   k6 run k6/slo-probe.js --env TARGET=https://staging.summit.internal
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
    // p95 response time must be under 200ms
    'http_req_duration{expected_response:true}': ['p(95)<200'],

    // Error rate must be under 1%
    http_req_failed: ['rate<0.01'],

    // 95% of requests must complete successfully
    checks: ['rate>0.95'],

    // Custom error rate threshold
    errors: ['rate<0.01'],
  },

  // Load profile
  stages: [
    { duration: '10s', target: 10 }, // Ramp up
    { duration: '30s', target: 50 }, // Steady load
    { duration: '10s', target: 0 }, // Ramp down
  ],
};

// Environment configuration
const BASE_URL = __ENV.TARGET || __ENV.BASE_URL || 'http://localhost:4000';
const API_KEY = __ENV.API_KEY || '';

console.log('🎯 SLO Probe targeting: ' + BASE_URL);

// Test scenarios
export default function () {
  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': 'k6-slo-probe/1.0',
  };

  if (API_KEY) {
    headers['Authorization'] = 'Bearer ' + API_KEY;
  }

  // 1. Health check endpoint
  let response = http.get(BASE_URL + '/health', {
    headers: headers,
    tags: { endpoint: 'health' },
  });

  const healthCheck = check(response, {
    '✅ Health endpoint responds': function(r) { return r.status === 200; },
    '⚡ Health response time <100ms': function(r) { return r.timings.duration < 100; },
  });

  errorRate.add(!healthCheck);
  responseTimeTrend.add(response.timings.duration);

  // 2. Ready check (more comprehensive)
  response = http.get(BASE_URL + '/health/ready', {
    headers: headers,
    tags: { endpoint: 'ready' },
  });

  const readyCheck = check(response, {
    '✅ Ready endpoint responds': function(r) { return r.status === 200; },
    '📊 Ready endpoint has valid JSON': function(r) {
      try {
        JSON.parse(r.body);
        return true;
      } catch (e) {
        return false;
      }
    },
    '⚡ Ready response time <200ms': function(r) { return r.timings.duration < 200; },
  });

  errorRate.add(!readyCheck);
  responseTimeTrend.add(response.timings.duration);

  // 3. Metrics endpoint (Prometheus format)
  response = http.get(BASE_URL + '/metrics', {
    headers: headers,
    tags: { endpoint: 'metrics' },
  });

  const metricsCheck = check(response, {
    '✅ Metrics endpoint responds': function(r) { return r.status === 200; },
    '📈 Metrics contain prometheus format': function(r) { return r.body && r.body.includes('# HELP'); },
    '⚡ Metrics response time <300ms': function(r) { return r.timings.duration < 300; },
  });

  errorRate.add(!metricsCheck);
  responseTimeTrend.add(response.timings.duration);

  // 4. GraphQL endpoint basic check
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

  // Object.assign used instead of spread syntax for compatibility
  const graphqlHeaders = Object.assign({}, headers, { 'Content-Type': 'application/json' });

  response = http.post(BASE_URL + '/graphql', JSON.stringify(graphqlQuery), {
    headers: graphqlHeaders,
    tags: { endpoint: 'graphql' },
  });

  const graphqlCheck = check(response, {
    '✅ GraphQL endpoint responds': function(r) { return r.status === 200; },
    '🔍 GraphQL returns valid schema': function(r) {
      try {
        const data = JSON.parse(r.body);
        return data.data && data.data.__schema;
      } catch (e) {
        return false;
      }
    },
    '⚡ GraphQL response time <500ms': function(r) { return r.timings.duration < 500; },
  });

  errorRate.add(!graphqlCheck);
  responseTimeTrend.add(response.timings.duration);

  // 5. API versioning check
  response = http.get(BASE_URL + '/api/v1/version', {
    headers: headers,
    tags: { endpoint: 'version' },
  });

  const versionCheck = check(response, {
    '✅ Version endpoint accessible': function(r) { return r.status === 200 || r.status === 404; }, // 404 is ok if not implemented
    '⚡ Version response time <100ms': function(r) { return r.timings.duration < 100; },
  });

  // Don't count 404 as error for version endpoint (may not be implemented)
  if (response.status !== 404) {
    errorRate.add(!versionCheck);
  }
  responseTimeTrend.add(response.timings.duration);

  // Simulate realistic user behavior
  sleep(1 + Math.random()); // 1-2 second pause between requests
}

// Setup function - runs once before the test
export function setup() {
  console.log('🚀 Starting SLO probe...');
  console.log('📊 Target: ' + BASE_URL);
  console.log('🎯 SLO Thresholds:');
  console.log('   • p95 latency: <200ms');
  console.log('   • Error rate: <1%');
  console.log('   • Success rate: >95%');

  return { startTime: new Date() };
}

// Teardown function - runs once after the test
export function teardown(data) {
  const duration = (new Date() - data.startTime) / 1000;
  console.log('✅ SLO probe completed in ' + duration.toFixed(1) + 's');
  console.log('📈 Check k6 output above for detailed SLO compliance results');
}

// Handle different test scenarios based on environment
export function handleSummary(data) {
  const summary = {
    stdout: textSummary(data, { indent: '  ', enableColors: true }),
  };

  // Output JSON summary for CI/CD integration
  if (__ENV.OUTPUT_JSON) {
    summary['slo-results.json'] = JSON.stringify({
      timestamp: new Date().toISOString(),
      target: BASE_URL,
      slos: {
        p95_latency: (data.metrics.http_req_duration && data.metrics.http_req_duration.values['p(95)']) || 0,
        error_rate: (data.metrics.http_req_failed && data.metrics.http_req_failed.values.rate) || 0,
        success_rate: (data.metrics.checks && data.metrics.checks.values.rate) || 0,
      },
      thresholds_passed: data.root_group.checks.filter(function(c) { return c.passes > 0; })
        .length,
      total_requests: (data.metrics.http_reqs && data.metrics.http_reqs.values.count) || 0,
      passed: Object.keys(data.thresholds).every(
        function(key) { return data.thresholds[key].ok; }
      ),
    });
  }

  return summary;
}

// Text summary helper (basic implementation)
function textSummary(data, options) {
  const indent = options.indent || '';
  const colors = options.enableColors || false;

  const p95 = (data.metrics.http_req_duration && data.metrics.http_req_duration.values['p(95)']) || 0;
  const errorRate = (data.metrics.http_req_failed && data.metrics.http_req_failed.values.rate) || 0;
  const successRate = (data.metrics.checks && data.metrics.checks.values.rate) || 0;

  const passed = p95 < 200 && errorRate < 0.01 && successRate > 0.95;
  const passedIcon = passed ? '🎉 PASSED' : '🚨 FAILED';
  const p95Icon = p95 < 200 ? '✅' : '❌';
  const errorIcon = errorRate < 0.01 ? '✅' : '❌';
  const successIcon = successRate > 0.95 ? '✅' : '❌';

  return '\n' +
indent + '📊 SLO Probe Results\n' +
indent + '==================\n' +
indent + '🎯 Target: ' + BASE_URL + '\n' +
indent + '⏱️  p95 Latency: ' + p95.toFixed(1) + 'ms (target: <200ms) ' + p95Icon + '\n' +
indent + '💥 Error Rate: ' + (errorRate * 100).toFixed(2) + '% (target: <1%) ' + errorIcon + '\n' +
indent + '✅ Success Rate: ' + (successRate * 100).toFixed(2) + '% (target: >95%) ' + successIcon + '\n' +
indent + '\n' +
indent + 'Overall SLO Status: ' + passedIcon + '\n' +
indent + 'Total Requests: ' + ((data.metrics.http_reqs && data.metrics.http_reqs.values.count) || 0) + '\n' +
indent + 'Test Duration: ' + (data.state.testRunDurationMs / 1000) + 's\n';
}
