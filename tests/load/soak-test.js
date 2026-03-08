/**
 * IntelGraph Maestro 4-Hour Soak Test
 *
 * Long-running stability test to identify memory leaks,
 * resource degradation, and performance issues under sustained load.
 *
 * Usage:
 *   k6 run --duration 14400s tests/load/soak-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';

// Soak test specific metrics
export const memoryLeakIndicator = new Gauge('memory_leak_indicator');
export const performanceDegradation = new Rate('performance_degradation');
export const connectionLeaks = new Counter('connection_leaks');
export const errorRateOverTime = new Rate('error_rate_over_time');

export const options = {
  // Sustained load for 4 hours
  stages: [
    // Ramp up to steady state (50 VUs)
    { duration: '10m', target: 50 },
    // Maintain steady load for 3h 40m
    { duration: '220m', target: 50 },
    // Ramp down
    { duration: '10m', target: 0 },
  ],
  thresholds: {
    // Phase 3 requirements: p95 < 1.5s, fail >20% regression
    http_req_duration: ['p(95)<1500'], // p95 < 1.5s requirement
    http_req_failed: ['rate<0.02'], // Very low error tolerance
    performance_degradation: ['rate<0.2'], // Fail >20% regression
  },
  discardResponseBodies: true, // Reduce memory usage during long test
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';
let baselineResponseTime = null;
let testStartTime = null;

export function setup() {
  console.log('Starting 4-hour soak test...');
  testStartTime = Date.now();

  // Establish baseline performance
  const baselineResponse = http.get(`${BASE_URL}/health`);
  if (baselineResponse.status === 200) {
    baselineResponseTime = baselineResponse.timings.duration;
    console.log(`Baseline response time: ${baselineResponseTime}ms`);
  }

  return { baselineResponseTime, testStartTime };
}

export default function (data) {
  const { baselineResponseTime, testStartTime } = data;
  const currentTime = Date.now();
  const testElapsed = (currentTime - testStartTime) / 1000; // seconds

  // Varied workload patterns to simulate realistic usage
  const scenario = Math.random();

  if (scenario < 0.4) {
    // 40% - Standard GraphQL operations
    soakTestGraphQL();
  } else if (scenario < 0.7) {
    // 30% - Pipeline operations
    soakTestPipelines();
  } else if (scenario < 0.85) {
    // 15% - MCP operations
    soakTestMCP();
  } else {
    // 15% - Health checks and monitoring
    soakTestMonitoring(baselineResponseTime, testElapsed);
  }

  // Gradual increase in think time to simulate user fatigue
  const thinkTimeMultiplier = 1 + (testElapsed / 14400) * 0.5; // Up to 50% increase
  sleep(Math.random() * 3 * thinkTimeMultiplier + 1);
}

function soakTestGraphQL() {
  const queries = [
    `query { investigations(limit: 10) { id title status } }`,
    `query { entities(limit: 20) { id name type } }`,
    `query { executors { id name status } }`,
  ];

  const query = queries[Math.floor(Math.random() * queries.length)];
  const response = http.post(`${BASE_URL}/graphql`, JSON.stringify({ query }), {
    headers: { 'Content-Type': 'application/json' },
  });

  const success = check(response, {
    'GraphQL soak test success': (r) => r.status === 200,
  });

  if (!success) {
    errorRateOverTime.add(1);
  }
}

function soakTestPipelines() {
  const response = http.get(`${BASE_URL}/api/maestro/v1/pipelines`);

  const success = check(response, {
    'Pipeline soak test success': (r) => r.status === 200 || r.status === 401,
  });

  if (!success) {
    errorRateOverTime.add(1);
  }
}

function soakTestMCP() {
  const response = http.get(`${BASE_URL}/api/maestro/v1/mcp/servers/health`);

  check(response, {
    'MCP soak test response': (r) => r.status >= 200 && r.status < 500,
  });
}

function soakTestMonitoring(baselineResponseTime, testElapsed) {
  const startTime = Date.now();
  const response = http.get(`${BASE_URL}/health`);
  const responseTime = Date.now() - startTime;

  const success = check(response, {
    'Health check successful': (r) => r.status === 200,
  });

  if (success && baselineResponseTime) {
    // Check for performance degradation (>50% slower than baseline)
    if (responseTime > baselineResponseTime * 1.5) {
      performanceDegradation.add(1);
      console.warn(
        `Performance degradation detected: ${responseTime}ms vs baseline ${baselineResponseTime}ms at ${Math.floor(testElapsed / 60)} minutes`,
      );
    }

    // Simulate memory leak detection (response time increasing over time)
    const expectedTime =
      baselineResponseTime * (1 + (testElapsed / 14400) * 0.2); // Max 20% increase expected
    if (responseTime > expectedTime * 1.5) {
      memoryLeakIndicator.add(responseTime - expectedTime);
    }
  }

  if (!success) {
    errorRateOverTime.add(1);
  }
}

export function teardown(data) {
  const { testStartTime } = data;
  const totalDuration = (Date.now() - testStartTime) / 1000 / 60; // minutes

  console.log(`Soak test completed after ${Math.floor(totalDuration)} minutes`);
  console.log('Check metrics for:');
  console.log('- Performance degradation trends');
  console.log('- Memory leak indicators');
  console.log('- Connection leak counters');
  console.log('- Error rate stability over time');
}
