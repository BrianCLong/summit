// k6 Synthetic Monitor - GraphQL p95 Budget Guard
// Usage: k6 run k6/graphql-latency.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  vus: 20,
  duration: '10m',
  thresholds: {
    http_req_duration: ['p(95)<1500'], // p95 < 1.5s SLO
    http_req_failed: ['rate<0.01'], // <1% failure rate
    checks: ['rate>0.95'], // >95% check success
  },
  stages: [
    { duration: '2m', target: 20 }, // ramp up
    { duration: '6m', target: 20 }, // steady state
    { duration: '2m', target: 0 }, // ramp down
  ],
};

// GraphQL Queries for Different Operations
const queries = {
  searchEntities: {
    query: `
      query SearchEntities($query: String!) {
        searchEntities(query: $query) {
          id
          name
          type
          confidence
          properties
          createdAt
        }
      }
    `,
    variables: { query: 'acme' },
  },

  getCaseDetails: {
    query: `
      query GetCaseDetails($caseId: ID!) {
        case(id: $caseId) {
          id
          name
          description
          status
          entities {
            id
            name
            type
          }
          relationships {
            id
            type
            source { id }
            target { id }
          }
          createdAt
          updatedAt
        }
      }
    `,
    variables: { caseId: 'CASE-123' },
  },

  getXAIExplanation: {
    query: `
      query GetXAIExplanation($entityId: ID!) {
        xaiExplanation(entityId: $entityId) {
          type
          importance
          confidence
          reasoning
          modelCard {
            name
            version
            accuracy
          }
        }
      }
    `,
    variables: { entityId: 'ENT-456' },
  },

  checkProvenance: {
    query: `
      query CheckProvenance($bundleId: ID!) {
        provenanceBundle(id: $bundleId) {
          id
          verified
          chainIntegrity
          manifest {
            artifacts
            signatures
          }
          createdAt
        }
      }
    `,
    variables: { bundleId: 'BUNDLE-789' },
  },
};

export default function () {
  const baseUrl = __ENV.API_URL || 'http://localhost:4001';
  const token = __ENV.AUTH_TOKEN || 'dev-token';

  // Randomly select a query to simulate real usage patterns
  const queryNames = Object.keys(queries);
  const randomQuery = queryNames[Math.floor(Math.random() * queryNames.length)];
  const selectedQuery = queries[randomQuery];

  const payload = JSON.stringify(selectedQuery);

  const params = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Test-User': 'k6-synthetic-monitor',
    },
    tags: {
      operation: randomQuery,
    },
  };

  // Execute GraphQL request
  const response = http.post(`${baseUrl}/graphql`, payload, params);

  // Validate response
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 1500ms': (r) => r.timings.duration < 1500,
    'response has data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data && !body.errors;
      } catch (e) {
        return false;
      }
    },
    'no GraphQL errors': (r) => {
      try {
        const body = JSON.parse(r.body);
        return !body.errors || body.errors.length === 0;
      } catch (e) {
        return false;
      }
    },
  });

  // Authority binding check for secured operations
  if (
    randomQuery === 'checkProvenance' ||
    randomQuery === 'getXAIExplanation'
  ) {
    check(response, {
      'authority binding enforced': (r) => {
        if (r.status === 200) return true; // Valid token case
        if (r.status === 403) return true; // Expected denial case
        return false; // Unexpected response
      },
    });
  }

  // Simulate realistic user behavior
  sleep(Math.random() * 2 + 0.5); // 0.5-2.5s between requests
}

// Custom teardown to log summary
export function teardown(data) {
  console.log('🎯 GraphQL Latency Test Summary:');
  console.log(`   Target: p95 < 1.5s, <1% errors, >95% checks`);
  console.log(`   Operations tested: ${Object.keys(queries).join(', ')}`);
  console.log(`   Authority binding validation included`);
}
