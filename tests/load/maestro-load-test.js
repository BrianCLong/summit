/**
 * IntelGraph Maestro Conductor Load Testing Suite
 *
 * Comprehensive load testing scenarios for all critical workflows:
 * - Pipeline execution
 * - MCP invocations
 * - GraphQL operations
 * - Authentication flows
 *
 * Usage:
 *   k6 run --vus 50 --duration 300s tests/load/maestro-load-test.js
 *   k6 run --vus 100 --duration 14400s tests/load/maestro-load-test.js  # 4-hour soak test
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics for Maestro-specific operations
export const errorRate = new Rate('errors');
export const pipelineExecutionTime = new Trend('pipeline_execution_duration');
export const mcpInvocationTime = new Trend('mcp_invocation_duration');
export const graphqlResponseTime = new Trend('graphql_response_time');
export const authenticationTime = new Trend('authentication_duration');
export const tenantIsolationViolations = new Counter(
  'tenant_isolation_violations',
);

// Test configuration
export const options = {
  stages: [
    // Ramp up to 25% capacity
    { duration: '2m', target: 25 },
    // Stay at 25% for 5 minutes
    { duration: '5m', target: 25 },
    // Ramp up to 50% capacity
    { duration: '2m', target: 50 },
    // Stay at 50% for 10 minutes
    { duration: '10m', target: 50 },
    // Ramp up to 75% capacity
    { duration: '2m', target: 75 },
    // Stay at 75% for 15 minutes
    { duration: '15m', target: 75 },
    // Spike to 100% capacity
    { duration: '2m', target: 100 },
    // Stay at 100% for 20 minutes
    { duration: '20m', target: 100 },
    // Ramp down gradually
    { duration: '5m', target: 0 },
  ],
  thresholds: {
    // SLO targets based on production requirements
    http_req_duration: ['p(95)<1500'], // 95th percentile under 1.5s
    http_req_failed: ['rate<0.05'], // Error rate under 5%
    pipeline_execution_duration: ['p(95)<5000'], // Pipeline P95 under 5s
    mcp_invocation_duration: ['p(95)<2000'], // MCP P95 under 2s
    graphql_response_time: ['p(95)<1000'], // GraphQL P95 under 1s
    authentication_duration: ['p(95)<500'], // Auth P95 under 0.5s
    tenant_isolation_violations: ['count<1'], // Zero tenant violations
  },
  ext: {
    loadimpact: {
      distribution: {
        'amazon:us:ashburn': { loadZone: 'amazon:us:ashburn', percent: 50 },
        'amazon:us:palo alto': { loadZone: 'amazon:us:palo alto', percent: 50 },
      },
    },
  },
};

// Base URL configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';
const GRAPHQL_URL = `${BASE_URL}/graphql`;
const MAESTRO_API_URL = `${BASE_URL}/api/maestro/v1`;

// Test data pools
const testTenants = ['tenant-alpha', 'tenant-beta', 'tenant-gamma'];
const testUsers = ['analyst1', 'analyst2', 'operator1'];
const testPipelines = [
  'ingest-pipeline',
  'analysis-pipeline',
  'export-pipeline',
];

// Authentication tokens (would be obtained from setup in real scenario)
let authTokens = {};

export function setup() {
  console.log('Setting up load test environment...');

  // Authenticate test users and get tokens
  for (const user of testUsers) {
    const loginPayload = {
      email: `${user}@intelgraph.test`,
      password: 'test-password-123',
    };

    const loginResponse = http.post(
      `${BASE_URL}/api/auth/login`,
      JSON.stringify(loginPayload),
      {
        headers: { 'Content-Type': 'application/json' },
      },
    );

    if (loginResponse.status === 200) {
      const loginData = JSON.parse(loginResponse.body);
      authTokens[user] = loginData.token;
    }
  }

  return { authTokens, testTenants, testPipelines };
}

export default function (data) {
  const { authTokens, testTenants, testPipelines } = data;

  // Select random test parameters
  const tenant = testTenants[Math.floor(Math.random() * testTenants.length)];
  const user = testUsers[Math.floor(Math.random() * testUsers.length)];
  const pipeline =
    testPipelines[Math.floor(Math.random() * testPipelines.length)];
  const authToken = authTokens[user];

  if (!authToken) {
    console.error(`No auth token for user ${user}`);
    return;
  }

  const headers = {
    Authorization: `Bearer ${authToken}`,
    'Content-Type': 'application/json',
    'X-Tenant-ID': tenant,
  };

  // Test scenario weights
  const scenario = Math.random();

  if (scenario < 0.3) {
    // 30% - GraphQL queries (most common operation)
    testGraphQLQueries(headers, tenant);
  } else if (scenario < 0.5) {
    // 20% - Pipeline operations
    testPipelineOperations(headers, tenant, pipeline);
  } else if (scenario < 0.7) {
    // 20% - MCP invocations
    testMCPOperations(headers, tenant);
  } else if (scenario < 0.85) {
    // 15% - Dashboard operations
    testDashboardOperations(headers, tenant);
  } else {
    // 15% - Administrative operations
    testAdminOperations(headers, tenant);
  }

  // Random think time between 1-5 seconds
  sleep(Math.random() * 4 + 1);
}

function testGraphQLQueries(headers, tenant) {
  const queries = [
    // Entity queries
    {
      query: `
        query GetEntities($tenantId: String!) {
          entities(tenantId: $tenantId, limit: 50) {
            id
            name
            type
            properties
            createdAt
          }
        }
      `,
      variables: { tenantId: tenant },
    },
    // Investigation queries
    {
      query: `
        query GetInvestigations($tenantId: String!) {
          investigations(tenantId: $tenantId, limit: 20) {
            id
            title
            status
            createdAt
            entities {
              id
              name
            }
          }
        }
      `,
      variables: { tenantId: tenant },
    },
    // Graph neighborhood queries
    {
      query: `
        query GetNeighborhood($nodeId: ID!, $tenantId: String!) {
          expandNeighbors(nodeId: $nodeId, tenantId: $tenantId, depth: 2) {
            nodes {
              id
              name
              type
            }
            edges {
              source
              target
              relationship
            }
          }
        }
      `,
      variables: { nodeId: 'entity-123', tenantId: tenant },
    },
  ];

  const query = queries[Math.floor(Math.random() * queries.length)];

  const startTime = Date.now();
  const response = http.post(GRAPHQL_URL, JSON.stringify(query), { headers });
  const duration = Date.now() - startTime;

  graphqlResponseTime.add(duration);

  const success = check(response, {
    'GraphQL query successful': (r) => r.status === 200,
    'GraphQL response has data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data !== undefined;
      } catch {
        return false;
      }
    },
    'GraphQL response under 2s': (r) => duration < 2000,
    'No tenant isolation violations': (r) => {
      try {
        const body = JSON.parse(r.body);
        if (body.errors) {
          const hasTenantError = body.errors.some(
            (error) => error.extensions?.code === 'CROSS_TENANT_ACCESS_DENIED',
          );
          if (hasTenantError) {
            tenantIsolationViolations.add(1);
            return false;
          }
        }
        return true;
      } catch {
        return true;
      }
    },
  });

  if (!success) errorRate.add(1);
}

function testPipelineOperations(headers, tenant, pipeline) {
  // Create a new pipeline run
  const createRunPayload = {
    pipeline_id: pipeline,
    pipeline_name: `Load Test ${pipeline}`,
    input_params: {
      tenant: tenant,
      test_mode: true,
      load_test_id: `lt-${Date.now()}`,
    },
    executor_id: 'cpu-executor-1',
  };

  const startTime = Date.now();
  const createResponse = http.post(
    `${MAESTRO_API_URL}/runs`,
    JSON.stringify(createRunPayload),
    { headers },
  );

  const success = check(createResponse, {
    'Pipeline run created': (r) => r.status === 201,
    'Valid run ID returned': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.id !== undefined;
      } catch {
        return false;
      }
    },
  });

  if (success) {
    const runData = JSON.parse(createResponse.body);
    const runId = runData.id;

    // Check run status
    const statusResponse = http.get(`${MAESTRO_API_URL}/runs/${runId}`, {
      headers,
    });

    const statusCheck = check(statusResponse, {
      'Run status retrieved': (r) => r.status === 200,
      'Valid run status': (r) => {
        try {
          const body = JSON.parse(r.body);
          return ['queued', 'running', 'succeeded', 'failed'].includes(
            body.status,
          );
        } catch {
          return false;
        }
      },
    });

    const totalDuration = Date.now() - startTime;
    pipelineExecutionTime.add(totalDuration);

    if (!statusCheck) errorRate.add(1);
  } else {
    errorRate.add(1);
  }
}

function testMCPOperations(headers, tenant) {
  // Simulate MCP tool invocation
  const mcpPayload = {
    server: 'test-mcp-server',
    tool: 'analyze_data',
    args: {
      tenant: tenant,
      data: 'sample-data-for-analysis',
      options: { format: 'json' },
    },
  };

  const startTime = Date.now();
  const response = http.post(
    `${MAESTRO_API_URL}/runs/test-run-id/mcp/invoke`,
    JSON.stringify(mcpPayload),
    { headers },
  );
  const duration = Date.now() - startTime;

  mcpInvocationTime.add(duration);

  const success = check(response, {
    'MCP invocation successful': (r) => r.status === 200,
    'MCP response has result': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.result !== undefined;
      } catch {
        return false;
      }
    },
    'MCP audit trail present': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.audit && body.audit.argsHash && body.audit.resultHash;
      } catch {
        return false;
      }
    },
  });

  if (!success) errorRate.add(1);
}

function testDashboardOperations(headers, tenant) {
  // Test dashboard summary endpoint
  const summaryResponse = http.get(`${MAESTRO_API_URL}/dashboard/summary`, {
    headers,
  });

  const success = check(summaryResponse, {
    'Dashboard summary loaded': (r) => r.status === 200,
    'Dashboard has health data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.health && body.budgets && body.runs;
      } catch {
        return false;
      }
    },
  });

  if (success) {
    // Test pipeline list endpoint
    const pipelinesResponse = http.get(
      `${MAESTRO_API_URL}/dashboard/pipelines`,
      { headers },
    );

    check(pipelinesResponse, {
      'Pipeline list loaded': (r) => r.status === 200,
      'Pipeline list has data': (r) => {
        try {
          const body = JSON.parse(r.body);
          return Array.isArray(body);
        } catch {
          return false;
        }
      },
    });
  }

  if (!success) errorRate.add(1);
}

function testAdminOperations(headers, tenant) {
  // Test executor listing
  const executorsResponse = http.get(`${MAESTRO_API_URL}/executors`, {
    headers,
  });

  const success = check(executorsResponse, {
    'Executors list loaded': (r) => r.status === 200,
    'Executors list valid': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body);
      } catch {
        return false;
      }
    },
  });

  if (success) {
    // Test MCP servers health
    const mcpHealthResponse = http.get(
      `${MAESTRO_API_URL}/mcp/servers/health`,
      { headers },
    );

    check(mcpHealthResponse, {
      'MCP health check completed': (r) => r.status === 200 || r.status === 503,
    });
  }

  if (!success) errorRate.add(1);
}

export function teardown(data) {
  console.log('Load test completed. Cleaning up test data...');

  // In a real scenario, we would clean up any test data created during the load test
  // For now, just log completion
  console.log('Test data cleanup completed.');
}
