import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const queryDuration = new Trend('query_duration');
const queriesPerSecond = new Counter('queries_per_second');

// Test configuration for different scenarios
export const options = {
  scenarios: {
    // Baseline load test
    baseline: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },  // Ramp up to 100 users
        { duration: '5m', target: 100 },  // Stay at 100 users
        { duration: '2m', target: 0 },    // Ramp down
      ],
      gracefulRampDown: '30s',
    },
    // Stress test
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 200 },
        { duration: '5m', target: 200 },
        { duration: '2m', target: 500 },
        { duration: '5m', target: 500 },
        { duration: '2m', target: 1000 },
        { duration: '10m', target: 1000 },
        { duration: '2m', target: 0 },
      ],
      startTime: '10m',
    },
    // Spike test
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 100 },
        { duration: '1m', target: 100 },
        { duration: '10s', target: 2000 },  // Spike!
        { duration: '3m', target: 2000 },
        { duration: '10s', target: 100 },
        { duration: '3m', target: 100 },
        { duration: '10s', target: 0 },
      ],
      startTime: '30m',
    },
    // Soak test (endurance)
    soak: {
      executor: 'constant-vus',
      vus: 500,
      duration: '4h',
      startTime: '45m',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% < 500ms, 99% < 1s
    http_req_failed: ['rate<0.01'], // Error rate < 1%
    errors: ['rate<0.01'],
    query_duration: ['p(95)<1000', 'p(99)<2000'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';
const API_KEY = __ENV.API_KEY || 'test-api-key';

// Sample GraphQL queries
const queries = {
  simpleQuery: `
    query GetUser($id: ID!) {
      user(id: $id) {
        id
        name
        email
      }
    }
  `,
  complexQuery: `
    query GetInvestigation($id: ID!) {
      investigation(id: $id) {
        id
        name
        entities {
          id
          name
          relationships {
            id
            type
            target {
              id
              name
            }
          }
        }
        timeline {
          id
          timestamp
          events {
            id
            type
            data
          }
        }
      }
    }
  `,
  aggregateQuery: `
    query GetStats {
      stats {
        totalInvestigations
        totalEntities
        totalRelationships
        recentActivity {
          count
          period
        }
      }
    }
  `,
  searchQuery: `
    query Search($term: String!) {
      search(term: $term) {
        entities {
          id
          name
          score
        }
        total
      }
    }
  `,
};

export default function () {
  const queryType = ['simpleQuery', 'complexQuery', 'aggregateQuery', 'searchQuery'][
    Math.floor(Math.random() * 4)
  ];

  const payload = JSON.stringify({
    query: queries[queryType],
    variables: {
      id: `entity-${Math.floor(Math.random() * 10000)}`,
      term: ['security', 'fraud', 'investigation', 'risk'][Math.floor(Math.random() * 4)],
    },
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
      'X-Request-ID': `load-test-${Date.now()}-${__VU}-${__ITER}`,
    },
    timeout: '30s',
  };

  const startTime = Date.now();
  const response = http.post(`${BASE_URL}/graphql`, payload, params);
  const duration = Date.now() - startTime;

  // Record metrics
  queryDuration.add(duration);
  queriesPerSecond.add(1);

  // Checks
  const success = check(response, {
    'status is 200': (r) => r.status === 200,
    'no errors in response': (r) => {
      const body = JSON.parse(r.body);
      return !body.errors || body.errors.length === 0;
    },
    'response time < 1s': (r) => r.timings.duration < 1000,
    'response time < 2s': (r) => r.timings.duration < 2000,
  });

  if (!success) {
    errorRate.add(1);
    console.error(`Query failed: ${queryType}, Status: ${response.status}`);
  }

  sleep(Math.random() * 2 + 1); // Random sleep 1-3 seconds
}

// Teardown function
export function teardown(data) {
  console.log('=== Load Test Summary ===');
  console.log(`Total queries: ${queriesPerSecond.value}`);
  console.log(`Error rate: ${(errorRate.value * 100).toFixed(2)}%`);
}
