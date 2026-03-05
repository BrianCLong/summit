/**
 * IntelGraph Maestro Capacity Planning Test
 *
 * Determines system capacity limits and optimal scaling thresholds.
 * Tests up to 3x expected production load with breakpoint analysis.
 *
 * Usage:
 *   k6 run tests/load/capacity-planning.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Capacity planning metrics
export const capacityMetrics = {
  throughputPerVU: new Trend('throughput_per_vu'),
  resourceUtilization: new Trend('resource_utilization'),
  breakpointReached: new Counter('breakpoint_reached'),
  optimalCapacity: new Trend('optimal_capacity_users'),
};

export const options = {
  stages: [
    // Progressive load increase to find capacity limits
    { duration: '5m', target: 10 }, // 10 VUs
    { duration: '5m', target: 25 }, // 25 VUs
    { duration: '5m', target: 50 }, // 50 VUs (1x expected)
    { duration: '5m', target: 100 }, // 100 VUs (2x expected)
    { duration: '5m', target: 150 }, // 150 VUs (3x expected)
    { duration: '5m', target: 200 }, // 200 VUs (4x expected)
    { duration: '5m', target: 300 }, // 300 VUs (6x expected) - stress test
    { duration: '2m', target: 0 }, // Ramp down
  ],
  thresholds: {
    // Capacity thresholds - expect degradation at higher loads
    http_req_duration: ['p(95)<5000'], // 5s at capacity limits
    http_req_failed: ['rate<0.10'], // 10% error rate threshold
    breakpoint_reached: ['count>0'], // Expect to reach breakpoint
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';
let requestCounts = {};
let responseTimeTrends = {};

export function setup() {
  console.log('Starting capacity planning test...');
  console.log(
    'This test will determine optimal capacity and scaling thresholds',
  );

  return {
    startTime: Date.now(),
    expectedBaselineRPS: 10, // requests per second at baseline
  };
}

export default function (data) {
  const currentVUs = __ENV.K6_VUS || 1;
  const requestStartTime = Date.now();

  // Track requests per VU level
  if (!requestCounts[currentVUs]) {
    requestCounts[currentVUs] = 0;
  }
  requestCounts[currentVUs]++;

  // Mixed workload for realistic capacity testing
  const workloadType = Math.random();
  let response;

  if (workloadType < 0.3) {
    // 30% - Heavy GraphQL queries
    response = capacityTestHeavyGraphQL();
  } else if (workloadType < 0.6) {
    // 30% - Pipeline operations
    response = capacityTestPipelines();
  } else if (workloadType < 0.8) {
    // 20% - MCP operations
    response = capacityTestMCP();
  } else {
    // 20% - Light monitoring operations
    response = capacityTestLight();
  }

  const requestEndTime = Date.now();
  const responseTime = requestEndTime - requestStartTime;

  // Track response time trends by VU count
  if (!responseTimeTrends[currentVUs]) {
    responseTimeTrends[currentVUs] = [];
  }
  responseTimeTrends[currentVUs].push(responseTime);

  // Calculate throughput per VU
  const throughput = 1000 / responseTime; // requests per second per VU
  capacityMetrics.throughputPerVU.add(throughput);

  // Detect capacity breakpoints
  if (responseTime > 3000 && currentVUs > 50) {
    // >3s response time above baseline
    capacityMetrics.breakpointReached.add(1);
  }

  // Optimal capacity tracking (sweet spot before degradation)
  if (responseTime < 1000 && throughput > 0.5) {
    capacityMetrics.optimalCapacity.add(currentVUs);
  }

  // Realistic think time scaling with load
  const thinkTime = Math.random() * 2 + 0.5; // 0.5-2.5s
  sleep(thinkTime);
}

function capacityTestHeavyGraphQL() {
  const heavyQuery = {
    query: `
      query CapacityTest($limit: Int!) {
        investigations(limit: $limit) {
          id
          title
          status
          createdAt
          entities {
            id
            name
            type
            properties
            relationships {
              id
              type
              target {
                id
                name
              }
            }
          }
          analytics {
            riskScore
            confidence
            indicators
          }
        }
      }
    `,
    variables: { limit: 50 },
  };

  const response = http.post(
    `${BASE_URL}/graphql`,
    JSON.stringify(heavyQuery),
    { headers: { 'Content-Type': 'application/json' } },
  );

  check(response, {
    'Heavy GraphQL capacity test': (r) => r.status === 200 || r.status === 401,
  });

  return response;
}

function capacityTestPipelines() {
  // Test pipeline listing and creation
  const listResponse = http.get(`${BASE_URL}/api/maestro/v1/pipelines`);

  if (listResponse.status === 200) {
    // Try to create a test pipeline
    const createPayload = {
      name: `Capacity-Test-Pipeline-${Date.now()}`,
      spec: {
        nodes: [
          { id: 'input', type: 'source' },
          { id: 'process', type: 'transform' },
          { id: 'output', type: 'sink' },
        ],
        edges: [
          { from: 'input', to: 'process' },
          { from: 'process', to: 'output' },
        ],
      },
    };

    const createResponse = http.post(
      `${BASE_URL}/api/maestro/v1/pipelines`,
      JSON.stringify(createPayload),
      { headers: { 'Content-Type': 'application/json' } },
    );

    check(createResponse, {
      'Pipeline capacity test': (r) => r.status === 201 || r.status === 401,
    });

    return createResponse;
  }

  return listResponse;
}

function capacityTestMCP() {
  const mcpHealthResponse = http.get(
    `${BASE_URL}/api/maestro/v1/mcp/servers/health`,
  );

  check(mcpHealthResponse, {
    'MCP capacity test': (r) => r.status >= 200 && r.status < 500,
  });

  return mcpHealthResponse;
}

function capacityTestLight() {
  const healthResponse = http.get(`${BASE_URL}/health`);

  check(healthResponse, {
    'Light capacity test': (r) => r.status === 200,
  });

  return healthResponse;
}

export function teardown(data) {
  console.log('\n=== CAPACITY PLANNING RESULTS ===');

  // Analyze request patterns by VU count
  console.log('\nRequest Distribution by VU Count:');
  Object.keys(requestCounts)
    .sort((a, b) => parseInt(a) - parseInt(b))
    .forEach((vus) => {
      console.log(`${vus} VUs: ${requestCounts[vus]} requests`);
    });

  // Response time analysis
  console.log('\nResponse Time Analysis by VU Count:');
  Object.keys(responseTimeTrends)
    .sort((a, b) => parseInt(a) - parseInt(b))
    .forEach((vus) => {
      const times = responseTimeTrends[vus];
      if (times.length > 0) {
        const avg = times.reduce((a, b) => a + b, 0) / times.length;
        const p95 = times.sort((a, b) => a - b)[
          Math.floor(times.length * 0.95)
        ];
        console.log(
          `${vus} VUs: Avg=${Math.round(avg)}ms, P95=${Math.round(p95)}ms`,
        );
      }
    });

  // Capacity recommendations
  console.log('\n=== CAPACITY RECOMMENDATIONS ===');
  console.log('Analyze the following for capacity planning:');
  console.log('1. Sweet spot VU count (before response time degradation)');
  console.log('2. Maximum sustainable VU count (acceptable error rates)');
  console.log('3. Resource scaling thresholds');
  console.log('4. Horizontal scaling trigger points');
  console.log('\nUse these results to configure:');
  console.log('- Kubernetes HPA settings');
  console.log('- Load balancer capacity');
  console.log('- Database connection pools');
  console.log('- Cache sizing');
}
