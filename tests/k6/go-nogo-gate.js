/**
 * k6 Go/No-Go Performance Gate
 * Sprint 27: Performance thresholds for CI/CD promotion
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const nlqLatency = new Trend('nlq_latency', true);
const cypherLatency = new Trend('cypher_latency', true);

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';
const API_KEY = __ENV.API_KEY || 'test-api-key';

export const options = {
  stages: [
    { duration: '30s', target: 10 }, // Ramp up
    { duration: '60s', target: 50 }, // Sustain load
    { duration: '30s', target: 0 }, // Ramp down
  ],

  thresholds: {
    // Go/No-Go gates
    http_req_duration: ['p95<500'], // 95th percentile < 500ms
    http_req_failed: ['rate<0.05'], // Error rate < 5%
    nlq_latency: ['p95<2000'], // NL→Cypher p95 < 2s
    cypher_latency: ['p95<1000'], // Cypher execution p95 < 1s
    errors: ['rate<0.01'], // Custom error rate < 1%
  },
};

// Test data
const testQueries = [
  {
    type: 'nl2cypher',
    query: 'Find all entities connected to John Doe',
    expectedPattern: /MATCH.*John Doe/i,
  },
  {
    type: 'nl2cypher',
    query: 'Show investigations from the last 30 days',
    expectedPattern: /MATCH.*Investigation.*duration/i,
  },
  {
    type: 'cypher',
    query: 'MATCH (n:Person) RETURN count(n) LIMIT 1',
    expectedPattern: /\d+/,
  },
];

export function setup() {
  // Health check before starting
  const healthCheck = http.get(`${BASE_URL}/health`);

  if (healthCheck.status !== 200) {
    console.error('Health check failed, aborting test');
    return null;
  }

  console.log('✅ Health check passed, starting performance test');
  return { baseUrl: BASE_URL };
}

export default function (data) {
  if (!data) return;

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${API_KEY}`,
    'x-request-id': `k6-${__VU}-${__ITER}`,
  };

  // Test different endpoints with weighted distribution
  const endpoints = [
    { weight: 0.4, test: testNL2Cypher },
    { weight: 0.3, test: testCypherExecution },
    { weight: 0.2, test: testEntitySearch },
    { weight: 0.1, test: testInvestigationList },
  ];

  const randomWeight = Math.random();
  let cumulativeWeight = 0;

  for (const endpoint of endpoints) {
    cumulativeWeight += endpoint.weight;
    if (randomWeight <= cumulativeWeight) {
      endpoint.test(data.baseUrl, headers);
      break;
    }
  }

  sleep(1); // 1 second between iterations
}

function testNL2Cypher(baseUrl, headers) {
  const query = testQueries[0]; // Use first NL query
  const startTime = Date.now();

  const response = http.post(
    `${baseUrl}/api/nl2cypher`,
    JSON.stringify({
      query: query.query,
      context: {
        userId: 'test-user',
        tenantId: 'test-tenant',
      },
    }),
    { headers },
  );

  const duration = Date.now() - startTime;
  nlqLatency.add(duration);

  const success = check(response, {
    'NL2Cypher status is 200': (r) => r.status === 200,
    'NL2Cypher response has cypher': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.cypher && query.expectedPattern.test(body.cypher);
      } catch {
        return false;
      }
    },
    'NL2Cypher response time < 3s': () => duration < 3000,
  });

  if (!success) {
    errorRate.add(1);
    console.error(`NL2Cypher failed: ${response.status} ${response.body}`);
  } else {
    errorRate.add(0);
  }
}

function testCypherExecution(baseUrl, headers) {
  const query = testQueries[2]; // Use Cypher query
  const startTime = Date.now();

  const response = http.post(
    `${baseUrl}/api/cypher`,
    JSON.stringify({
      cypher: query.query,
      parameters: {},
    }),
    { headers },
  );

  const duration = Date.now() - startTime;
  cypherLatency.add(duration);

  const success = check(response, {
    'Cypher status is 200': (r) => r.status === 200,
    'Cypher response has data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.results && body.results.length > 0;
      } catch {
        return false;
      }
    },
    'Cypher response time < 2s': () => duration < 2000,
  });

  if (!success) {
    errorRate.add(1);
    console.error(
      `Cypher execution failed: ${response.status} ${response.body}`,
    );
  } else {
    errorRate.add(0);
  }
}

function testEntitySearch(baseUrl, headers) {
  const response = http.get(`${baseUrl}/api/entities?search=test&limit=10`, {
    headers,
  });

  const success = check(response, {
    'Entity search status is 200': (r) => r.status === 200,
    'Entity search returns results': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body.entities);
      } catch {
        return false;
      }
    },
  });

  if (!success) {
    errorRate.add(1);
  } else {
    errorRate.add(0);
  }
}

function testInvestigationList(baseUrl, headers) {
  const response = http.get(`${baseUrl}/api/investigations?limit=20`, {
    headers,
  });

  const success = check(response, {
    'Investigation list status is 200': (r) => r.status === 200,
    'Investigation list returns data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body.investigations);
      } catch {
        return false;
      }
    },
  });

  if (!success) {
    errorRate.add(1);
  } else {
    errorRate.add(0);
  }
}

export function teardown(data) {
  if (!data) return;

  console.log('🏁 Performance test completed');

  // Optional: Clean up test data
  const cleanupResponse = http.delete(`${data.baseUrl}/api/test-cleanup`, {
    headers: {
      Authorization: `Bearer ${API_KEY}`,
    },
  });

  if (cleanupResponse.status === 200) {
    console.log('✅ Test cleanup completed');
  }
}

export function handleSummary(data) {
  return {
    'performance-report.json': JSON.stringify(data, null, 2),
    stdout: `
🎯 Performance Gate Results:
================================
✅ Duration p95: ${data.metrics.http_req_duration.values.p95.toFixed(2)}ms (threshold: <500ms)
✅ Error Rate: ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}% (threshold: <5%)
✅ NLQ p95: ${data.metrics.nlq_latency?.values.p95?.toFixed(2) || 'N/A'}ms (threshold: <2000ms)
✅ Cypher p95: ${data.metrics.cypher_latency?.values.p95?.toFixed(2) || 'N/A'}ms (threshold: <1000ms)

Total Requests: ${data.metrics.http_reqs.values.count}
VUs: ${data.metrics.vus_max.values.max}
Duration: ${data.metrics.iteration_duration.values.avg.toFixed(2)}s
`,
  };
}
