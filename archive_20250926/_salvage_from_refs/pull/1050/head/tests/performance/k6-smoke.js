import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom metrics
const graphqlErrors = new Counter('graphql_errors');
const graphqlSuccessRate = new Rate('graphql_success_rate');
const investigationCreationTime = new Trend('investigation_creation_time');
const entityCreationTime = new Trend('entity_creation_time');

// Configuration
export const options = {
  // Define performance thresholds that FAIL the test if not met
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests must complete within 2s
    http_req_failed: ['rate<0.05'], // Error rate must be below 5%
    graphql_success_rate: ['rate>0.95'], // GraphQL success rate must be above 95%
    investigation_creation_time: ['p(90)<1000'], // 90% of investigation creation must be under 1s
    entity_creation_time: ['p(90)<500'], // 90% of entity creation must be under 500ms
    checks: ['rate>0.95'], // 95% of checks must pass
  },
  stages: [
    { duration: '30s', target: 5 }, // Ramp up to 5 virtual users
    { duration: '1m', target: 10 }, // Stay at 10 virtual users for 1 minute
    { duration: '30s', target: 0 }, // Ramp down to 0 users
  ],
};

// Environment configuration
const BASE_URL = __ENV.API_URL || 'http://localhost:4000';
const WS_URL = __ENV.WS_URL || 'ws://localhost:4000';
const FRONTEND_URL = __ENV.FRONTEND_URL || 'http://localhost:3000';

// GraphQL queries and mutations
const HEALTH_CHECK_QUERY = `
  query HealthCheck {
    __typename
  }
`;

const CREATE_INVESTIGATION_MUTATION = `
  mutation CreateInvestigation($input: InvestigationInput!) {
    createInvestigation(input: $input) {
      id
      name
      description
      createdAt
    }
  }
`;

const CREATE_ENTITY_MUTATION = `
  mutation CreateEntity($input: EntityInput!) {
    createEntity(input: $input) {
      id
      type
      props
    }
  }
`;

const GET_ENTITIES_QUERY = `
  query GetEntities($limit: Int) {
    entities(limit: $limit) {
      id
      type
      props
    }
  }
`;

const GET_PSYOPS_STATUS_QUERY = `
  query GetPsyOpsStatus {
    getPsyOpsStatus {
      counterPsyOpsEngine {
        status
        detectedThreats
      }
      disinformationDetection {
        status
        confidenceScore
      }
      adversarySimulation {
        status
        generatedTTPs
      }
    }
  }
`;

// Helper function to make GraphQL requests
function graphqlRequest(query, variables = {}) {
  const payload = JSON.stringify({
    query: query,
    variables: variables
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: '10s',
  };

  return http.post(`${BASE_URL}/graphql`, payload, params);
}

// Test setup
export function setup() {
  console.log(`Starting k6 performance test against ${BASE_URL}`);
  
  // Verify that the API is accessible
  const healthResponse = graphqlRequest(HEALTH_CHECK_QUERY);
  
  if (healthResponse.status !== 200) {
    throw new Error(`API not accessible: ${healthResponse.status}`);
  }
  
  console.log('API health check passed, starting performance test...');
  return { baseUrl: BASE_URL };
}

// Main test function
export default function(data) {
  // Test 1: API Health Check
  const healthStart = Date.now();
  const healthResponse = graphqlRequest(HEALTH_CHECK_QUERY);
  
  const healthSuccess = check(healthResponse, {
    'health check status is 200': (r) => r.status === 200,
    'health check response time < 1s': (r) => r.timings.duration < 1000,
    'health check has valid response': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data && body.data.__typename;
      } catch (e) {
        return false;
      }
    },
  });
  
  graphqlSuccessRate.add(healthSuccess);
  if (!healthSuccess) {
    graphqlErrors.add(1);
  }

  sleep(0.5);

  // Test 2: Create Investigation (Core workflow)
  const investigationStart = Date.now();
  const investigationResponse = graphqlRequest(CREATE_INVESTIGATION_MUTATION, {
    input: {
      name: `K6 Performance Test Investigation ${__VU}-${__ITER}`,
      description: 'Performance test investigation created by k6'
    }
  });
  
  const investigationSuccess = check(investigationResponse, {
    'investigation creation status is 200': (r) => r.status === 200,
    'investigation creation has no GraphQL errors': (r) => {
      try {
        const body = JSON.parse(r.body);
        return !body.errors;
      } catch (e) {
        return false;
      }
    },
    'investigation creation returns valid ID': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data && body.data.createInvestigation && body.data.createInvestigation.id;
      } catch (e) {
        return false;
      }
    },
  });
  
  investigationCreationTime.add(Date.now() - investigationStart);
  graphqlSuccessRate.add(investigationSuccess);
  if (!investigationSuccess) {
    graphqlErrors.add(1);
  }

  sleep(0.3);

  // Test 3: Create Entity (Core workflow)
  const entityStart = Date.now();
  const entityResponse = graphqlRequest(CREATE_ENTITY_MUTATION, {
    input: {
      type: 'PERSON',
      props: {
        name: `Test Person ${__VU}-${__ITER}`,
        role: 'performance_test',
        confidence: 0.95
      }
    }
  });
  
  const entitySuccess = check(entityResponse, {
    'entity creation status is 200': (r) => r.status === 200,
    'entity creation has no GraphQL errors': (r) => {
      try {
        const body = JSON.parse(r.body);
        return !body.errors;
      } catch (e) {
        return false;
      }
    },
    'entity creation returns valid data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data && body.data.createEntity && body.data.createEntity.id;
      } catch (e) {
        return false;
      }
    },
  });
  
  entityCreationTime.add(Date.now() - entityStart);
  graphqlSuccessRate.add(entitySuccess);
  if (!entitySuccess) {
    graphqlErrors.add(1);
  }

  sleep(0.3);

  // Test 4: Query Entities (Read performance)
  const entitiesResponse = graphqlRequest(GET_ENTITIES_QUERY, {
    limit: 10
  });
  
  const entitiesSuccess = check(entitiesResponse, {
    'entities query status is 200': (r) => r.status === 200,
    'entities query response time < 1s': (r) => r.timings.duration < 1000,
    'entities query returns array': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data && Array.isArray(body.data.entities);
      } catch (e) {
        return false;
      }
    },
  });
  
  graphqlSuccessRate.add(entitiesSuccess);
  if (!entitiesSuccess) {
    graphqlErrors.add(1);
  }

  sleep(0.2);

  // Test 5: PsyOps Status (New feature performance)
  const psyopsResponse = graphqlRequest(GET_PSYOPS_STATUS_QUERY);
  
  const psyopsSuccess = check(psyopsResponse, {
    'psyops status query status is 200': (r) => r.status === 200,
    'psyops status response time < 2s': (r) => r.timings.duration < 2000,
    'psyops status returns valid data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data && body.data.getPsyOpsStatus;
      } catch (e) {
        return false;
      }
    },
  });
  
  graphqlSuccessRate.add(psyopsSuccess);
  if (!psyopsSuccess) {
    graphqlErrors.add(1);
  }

  sleep(0.2);

  // Test 6: Frontend availability
  const frontendResponse = http.get(FRONTEND_URL, { timeout: '5s' });
  
  check(frontendResponse, {
    'frontend status is 200': (r) => r.status === 200,
    'frontend response time < 3s': (r) => r.timings.duration < 3000,
    'frontend returns HTML': (r) => r.headers['Content-Type'] && r.headers['Content-Type'].includes('text/html'),
  });

  sleep(1);
}

// WebSocket test function (run separately)
export function websocketTest() {
  const wsUrl = `${WS_URL}/socket.io/?EIO=4&transport=websocket`;
  
  const response = ws.connect(wsUrl, {}, function (socket) {
    socket.on('open', () => {
      console.log('WebSocket connection established');
    });

    socket.on('message', (data) => {
      console.log('Received WebSocket message');
    });

    socket.on('error', (e) => {
      console.log('WebSocket error:', e);
    });

    // Keep connection open for 5 seconds
    setTimeout(() => {
      socket.close();
    }, 5000);
  });

  check(response, {
    'websocket connection established': (r) => r && r.url === wsUrl,
  });
}

// Teardown function
export function teardown(data) {
  console.log('k6 performance test completed');
  console.log(`GraphQL errors: ${graphqlErrors.count || 0}`);
  console.log(`Test completed against: ${data.baseUrl}`);
}

// Export functions for different test scenarios
export { websocketTest };