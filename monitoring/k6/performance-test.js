/**
 * K6 Performance Test Suite for IntelGraph Platform
 *
 * Run with: k6 run monitoring/k6/performance-test.js
 *
 * Environment variables:
 * - BASE_URL: API base URL (default: http://localhost:4000)
 * - API_KEY: API key for authentication
 * - VUS: Number of virtual users
 * - DURATION: Test duration
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { randomString, randomItem } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

// Custom metrics
const errorRate = new Rate('error_rate');
const apiLatency = new Trend('api_latency', true);
const graphqlLatency = new Trend('graphql_latency', true);
const healthCheckLatency = new Trend('health_check_latency', true);
const authLatency = new Trend('auth_latency', true);
const requestsTotal = new Counter('requests_total');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';
const API_KEY = __ENV.API_KEY || '';

// Test options with different scenarios
export const options = {
  scenarios: {
    // Smoke test - minimal load
    smoke: {
      executor: 'constant-vus',
      vus: 1,
      duration: '1m',
      tags: { test_type: 'smoke' },
      exec: 'smokeTest',
    },

    // Load test - average expected load
    load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },   // Ramp up
        { duration: '5m', target: 50 },   // Stay at 50 users
        { duration: '2m', target: 100 },  // Ramp up to peak
        { duration: '5m', target: 100 },  // Stay at peak
        { duration: '2m', target: 0 },    // Ramp down
      ],
      tags: { test_type: 'load' },
      exec: 'loadTest',
      startTime: '1m',  // Start after smoke test
    },

    // Stress test - beyond normal capacity
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },
        { duration: '5m', target: 200 },
        { duration: '5m', target: 300 },
        { duration: '2m', target: 0 },
      ],
      tags: { test_type: 'stress' },
      exec: 'stressTest',
      startTime: '17m',  // Start after load test
    },

    // Spike test - sudden traffic spike
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 200 },  // Sudden spike
        { duration: '1m', target: 200 },   // Stay at spike
        { duration: '10s', target: 0 },    // Quick drop
      ],
      tags: { test_type: 'spike' },
      exec: 'spikeTest',
      startTime: '32m',
    },

    // Soak test - sustained load over time (for memory leaks, etc.)
    soak: {
      executor: 'constant-vus',
      vus: 50,
      duration: '30m',
      tags: { test_type: 'soak' },
      exec: 'soakTest',
      startTime: '35m',
    },
  },

  // Thresholds - fail test if these are exceeded
  thresholds: {
    // Overall error rate < 1%
    'error_rate': ['rate<0.01'],

    // API latency p95 < 500ms, p99 < 1000ms
    'api_latency': ['p(95)<500', 'p(99)<1000'],

    // GraphQL latency p95 < 500ms
    'graphql_latency': ['p(95)<500', 'p(99)<1000'],

    // Health check should always be fast
    'health_check_latency': ['p(99)<100'],

    // HTTP errors < 1%
    'http_req_failed': ['rate<0.01'],

    // Request duration p95 < 500ms
    'http_req_duration': ['p(95)<500', 'p(99)<1000'],
  },

  // Output to different backends
  // Uncomment as needed
  // ext: {
  //   loadimpact: {
  //     projectID: '<project-id>',
  //     name: 'IntelGraph Performance Test',
  //   },
  // },
};

// Helper functions
function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_KEY}`,
    'X-Request-ID': randomString(16),
  };
}

function checkResponse(res, name) {
  const success = check(res, {
    [`${name} status is 200`]: (r) => r.status === 200,
    [`${name} response time OK`]: (r) => r.timings.duration < 1000,
    [`${name} no error in body`]: (r) => !r.body.includes('error'),
  });
  errorRate.add(!success);
  requestsTotal.add(1);
  return success;
}

// ============================================
// Test Functions
// ============================================

// Health Check Test
export function healthCheck() {
  group('Health Checks', function () {
    // Basic health
    let res = http.get(`${BASE_URL}/health`, { tags: { name: 'health' } });
    healthCheckLatency.add(res.timings.duration);
    checkResponse(res, 'health');

    // Detailed health
    res = http.get(`${BASE_URL}/health/detailed`, { tags: { name: 'health_detailed' } });
    healthCheckLatency.add(res.timings.duration);
    checkResponse(res, 'health_detailed');

    // Readiness
    res = http.get(`${BASE_URL}/health/ready`, { tags: { name: 'health_ready' } });
    healthCheckLatency.add(res.timings.duration);
    checkResponse(res, 'health_ready');

    // Liveness
    res = http.get(`${BASE_URL}/health/live`, { tags: { name: 'health_live' } });
    healthCheckLatency.add(res.timings.duration);
    checkResponse(res, 'health_live');
  });
}

// API Endpoint Tests
export function apiTests() {
  group('API Endpoints', function () {
    const headers = getHeaders();

    // List entities
    let res = http.get(`${BASE_URL}/api/entities?limit=10`, { headers, tags: { name: 'list_entities' } });
    apiLatency.add(res.timings.duration);
    checkResponse(res, 'list_entities');

    // Get single entity (if we have one from list)
    if (res.status === 200 && res.json().data && res.json().data.length > 0) {
      const entityId = res.json().data[0].id;
      res = http.get(`${BASE_URL}/api/entities/${entityId}`, { headers, tags: { name: 'get_entity' } });
      apiLatency.add(res.timings.duration);
      checkResponse(res, 'get_entity');
    }

    // Search entities
    res = http.get(`${BASE_URL}/api/entities/search?q=test&limit=10`, { headers, tags: { name: 'search_entities' } });
    apiLatency.add(res.timings.duration);
    checkResponse(res, 'search_entities');

    // List investigations
    res = http.get(`${BASE_URL}/api/investigations?limit=10`, { headers, tags: { name: 'list_investigations' } });
    apiLatency.add(res.timings.duration);
    checkResponse(res, 'list_investigations');
  });
}

// GraphQL Tests
export function graphqlTests() {
  group('GraphQL Queries', function () {
    const headers = getHeaders();

    // Simple query
    let query = JSON.stringify({
      query: '{ __typename }',
    });
    let res = http.post(`${BASE_URL}/graphql`, query, { headers, tags: { name: 'graphql_typename' } });
    graphqlLatency.add(res.timings.duration);
    checkResponse(res, 'graphql_typename');

    // Entities query
    query = JSON.stringify({
      query: `
        query GetEntities($limit: Int) {
          entities(limit: $limit) {
            id
            name
            type
            createdAt
          }
        }
      `,
      variables: { limit: 10 },
    });
    res = http.post(`${BASE_URL}/graphql`, query, { headers, tags: { name: 'graphql_entities' } });
    graphqlLatency.add(res.timings.duration);
    checkResponse(res, 'graphql_entities');

    // Complex query with relationships
    query = JSON.stringify({
      query: `
        query GetEntityWithRelations($id: ID!) {
          entity(id: $id) {
            id
            name
            relationships {
              type
              target {
                id
                name
              }
            }
          }
        }
      `,
      variables: { id: 'test-entity-id' },
    });
    res = http.post(`${BASE_URL}/graphql`, query, { headers, tags: { name: 'graphql_entity_relations' } });
    graphqlLatency.add(res.timings.duration);
    // Don't fail on 404 for test entity
    if (res.status !== 404) {
      checkResponse(res, 'graphql_entity_relations');
    }
  });
}

// Authentication Tests
export function authTests() {
  group('Authentication', function () {
    // Test with valid token
    let res = http.get(`${BASE_URL}/api/me`, {
      headers: getHeaders(),
      tags: { name: 'auth_me' },
    });
    authLatency.add(res.timings.duration);
    check(res, {
      'auth returns 200 or 401': (r) => [200, 401].includes(r.status),
    });

    // Test without token
    res = http.get(`${BASE_URL}/api/entities`, {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'auth_no_token' },
    });
    check(res, {
      'no token returns 401': (r) => r.status === 401,
    });
  });
}

// ============================================
// Scenario Executors
// ============================================

export function smokeTest() {
  healthCheck();
  sleep(1);
}

export function loadTest() {
  healthCheck();
  apiTests();
  graphqlTests();
  sleep(Math.random() * 2 + 1); // 1-3 seconds
}

export function stressTest() {
  healthCheck();
  apiTests();
  graphqlTests();
  authTests();
  sleep(Math.random() * 1); // 0-1 seconds
}

export function spikeTest() {
  healthCheck();
  apiTests();
  // No sleep - maximum load
}

export function soakTest() {
  healthCheck();
  apiTests();
  graphqlTests();
  sleep(Math.random() * 3 + 2); // 2-5 seconds
}

// Default function (runs all tests sequentially)
export default function () {
  healthCheck();
  sleep(1);
  apiTests();
  sleep(1);
  graphqlTests();
  sleep(1);
  authTests();
  sleep(1);
}

// Setup function - runs once at the start
export function setup() {
  console.log(`Starting performance tests against ${BASE_URL}`);

  // Verify API is reachable
  const res = http.get(`${BASE_URL}/health`);
  if (res.status !== 200) {
    throw new Error(`API is not healthy: ${res.status}`);
  }

  return {
    startTime: new Date().toISOString(),
    baseUrl: BASE_URL,
  };
}

// Teardown function - runs once at the end
export function teardown(data) {
  console.log(`Performance tests completed. Started at: ${data.startTime}`);
}

// Handle summary
export function handleSummary(data) {
  const summary = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    metrics: {
      requestsTotal: data.metrics.requests_total?.values?.count || 0,
      errorRate: data.metrics.error_rate?.values?.rate || 0,
      apiLatencyP95: data.metrics.api_latency?.values?.['p(95)'] || 0,
      graphqlLatencyP95: data.metrics.graphql_latency?.values?.['p(95)'] || 0,
      httpReqDurationP95: data.metrics.http_req_duration?.values?.['p(95)'] || 0,
      httpReqFailed: data.metrics.http_req_failed?.values?.rate || 0,
    },
    thresholds: {
      passed: Object.values(data.thresholds || {}).every((t) => t.ok),
      details: data.thresholds,
    },
  };

  return {
    'stdout': JSON.stringify(summary, null, 2),
    './results/performance-results.json': JSON.stringify(summary, null, 2),
    './results/full-report.json': JSON.stringify(data, null, 2),
  };
}
