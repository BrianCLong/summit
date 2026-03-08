/**
 * k6 Load Test: GraphQL API
 *
 * Implements Prompt 19: Concurrency and Load Testing Strategy
 *
 * Usage:
 *   k6 run tests/load/k6/graphql-load.js
 *   k6 run --vus 100 --duration 30m tests/load/k6/graphql-load.js
 *
 * Environment variables:
 *   API_URL - GraphQL endpoint (default: http://localhost:4000/graphql)
 *   API_KEY - Authentication key
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { randomString, randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

// Custom metrics
const errorRate = new Rate('errors');
const graphqlLatency = new Trend('graphql_latency', true);
const queryLatency = new Trend('query_latency', true);
const mutationLatency = new Trend('mutation_latency', true);
const searchLatency = new Trend('search_latency', true);
const successfulRequests = new Counter('successful_requests');
const failedRequests = new Counter('failed_requests');

// Test configuration
const API_URL = __ENV.API_URL || 'http://localhost:4000/graphql';
const API_KEY = __ENV.API_KEY || 'test-api-key';

// Load test scenarios
export const options = {
  scenarios: {
    // Smoke test: Quick validation
    smoke: {
      executor: 'constant-vus',
      vus: 10,
      duration: '5m',
      tags: { scenario: 'smoke' },
      exec: 'smokeTest',
    },

    // Load test: Normal expected load
    load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },   // Ramp up
        { duration: '5m', target: 100 },  // Stay at 100
        { duration: '2m', target: 100 },  // Continue
        { duration: '2m', target: 0 },    // Ramp down
      ],
      tags: { scenario: 'load' },
      exec: 'loadTest',
      startTime: '5m', // Start after smoke
    },

    // Stress test: Beyond normal capacity
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },
        { duration: '5m', target: 200 },
        { duration: '5m', target: 300 },
        { duration: '5m', target: 500 },
        { duration: '5m', target: 300 },
        { duration: '2m', target: 0 },
      ],
      tags: { scenario: 'stress' },
      exec: 'stressTest',
      startTime: '16m', // Start after load
    },

    // Spike test: Sudden traffic burst
    spike: {
      executor: 'ramping-vus',
      startVUs: 10,
      stages: [
        { duration: '30s', target: 10 },
        { duration: '30s', target: 500 },  // Spike!
        { duration: '1m', target: 500 },
        { duration: '30s', target: 10 },
        { duration: '2m', target: 10 },
      ],
      tags: { scenario: 'spike' },
      exec: 'spikeTest',
      startTime: '40m', // Start after stress
    },
  },

  // Thresholds (SLIs)
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<2000'],
    http_req_failed: ['rate<0.01'],
    errors: ['rate<0.05'],
    graphql_latency: ['p(95)<400', 'p(99)<1500'],
    query_latency: ['p(95)<300', 'p(99)<1000'],
    mutation_latency: ['p(95)<500', 'p(99)<2000'],
    search_latency: ['p(95)<600', 'p(99)<2500'],
  },
};

// GraphQL queries and mutations
const QUERIES = {
  getInvestigation: `
    query GetInvestigation($id: ID!) {
      investigation(id: $id) {
        id
        title
        status
        createdAt
        entities {
          id
          name
          type
        }
      }
    }
  `,

  listInvestigations: `
    query ListInvestigations($limit: Int, $offset: Int) {
      investigations(limit: $limit, offset: $offset) {
        items {
          id
          title
          status
        }
        totalCount
        hasMore
      }
    }
  `,

  searchEntities: `
    query SearchEntities($query: String!, $types: [EntityType!], $limit: Int) {
      searchEntities(query: $query, types: $types, limit: $limit) {
        items {
          id
          name
          type
          properties
        }
        totalCount
      }
    }
  `,

  getEntityRelationships: `
    query GetEntityRelationships($entityId: ID!, $depth: Int) {
      entity(id: $entityId) {
        id
        name
        relationships(depth: $depth) {
          id
          type
          target {
            id
            name
            type
          }
        }
      }
    }
  `,
};

const MUTATIONS = {
  createInvestigation: `
    mutation CreateInvestigation($input: CreateInvestigationInput!) {
      createInvestigation(input: $input) {
        id
        title
        status
      }
    }
  `,

  addEntity: `
    mutation AddEntity($investigationId: ID!, $input: AddEntityInput!) {
      addEntity(investigationId: $investigationId, input: $input) {
        id
        name
        type
      }
    }
  `,
};

// Helper function to make GraphQL requests
function graphqlRequest(query, variables = {}, operationName = null) {
  const payload = JSON.stringify({
    query,
    variables,
    operationName,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    tags: { name: operationName || 'graphql' },
  };

  const startTime = Date.now();
  const response = http.post(API_URL, payload, params);
  const duration = Date.now() - startTime;

  graphqlLatency.add(duration);

  const success = check(response, {
    'status is 200': (r) => r.status === 200,
    'no GraphQL errors': (r) => {
      try {
        const body = JSON.parse(r.body);
        return !body.errors || body.errors.length === 0;
      } catch {
        return false;
      }
    },
  });

  if (success) {
    successfulRequests.add(1);
  } else {
    failedRequests.add(1);
    errorRate.add(1);
  }

  return { response, duration, success };
}

// Smoke test: Basic functionality
export function smokeTest() {
  group('smoke_queries', () => {
    // Simple query
    const result = graphqlRequest(
      QUERIES.listInvestigations,
      { limit: 10, offset: 0 },
      'ListInvestigations'
    );
    queryLatency.add(result.duration);
  });

  sleep(randomIntBetween(1, 3));
}

// Load test: Normal operations
export function loadTest() {
  group('load_mixed_operations', () => {
    // 70% reads, 30% writes
    const isRead = Math.random() < 0.7;

    if (isRead) {
      // Read operations
      const readType = Math.random();

      if (readType < 0.4) {
        // List investigations
        const result = graphqlRequest(
          QUERIES.listInvestigations,
          { limit: 20, offset: randomIntBetween(0, 100) },
          'ListInvestigations'
        );
        queryLatency.add(result.duration);
      } else if (readType < 0.7) {
        // Search entities
        const searchTerms = ['person', 'org', 'location', 'event', 'test'];
        const result = graphqlRequest(
          QUERIES.searchEntities,
          {
            query: searchTerms[randomIntBetween(0, searchTerms.length - 1)],
            types: ['Person', 'Organization'],
            limit: 50,
          },
          'SearchEntities'
        );
        searchLatency.add(result.duration);
      } else {
        // Get entity relationships
        const result = graphqlRequest(
          QUERIES.getEntityRelationships,
          {
            entityId: `entity-${randomIntBetween(1, 1000)}`,
            depth: 2,
          },
          'GetEntityRelationships'
        );
        queryLatency.add(result.duration);
      }
    } else {
      // Write operations
      const result = graphqlRequest(
        MUTATIONS.createInvestigation,
        {
          input: {
            title: `Load Test Investigation ${randomString(8)}`,
            description: 'Created during load test',
          },
        },
        'CreateInvestigation'
      );
      mutationLatency.add(result.duration);
    }
  });

  sleep(randomIntBetween(1, 5) / 10); // 0.1-0.5 seconds
}

// Stress test: Heavy load
export function stressTest() {
  group('stress_heavy_operations', () => {
    // Complex queries under stress
    const complexQuery = graphqlRequest(
      QUERIES.getEntityRelationships,
      {
        entityId: `entity-${randomIntBetween(1, 100)}`,
        depth: 3, // Deeper traversal
      },
      'GetEntityRelationships'
    );
    queryLatency.add(complexQuery.duration);

    // Search with broad terms
    const searchResult = graphqlRequest(
      QUERIES.searchEntities,
      {
        query: '*',
        limit: 100,
      },
      'SearchEntities'
    );
    searchLatency.add(searchResult.duration);
  });

  sleep(randomIntBetween(1, 3) / 10);
}

// Spike test: Burst traffic
export function spikeTest() {
  group('spike_burst', () => {
    // Quick succession of requests
    for (let i = 0; i < 3; i++) {
      graphqlRequest(
        QUERIES.listInvestigations,
        { limit: 10, offset: i * 10 },
        'ListInvestigations'
      );
    }
  });

  sleep(0.1);
}

// Teardown: Report summary
export function handleSummary(data) {
  return {
    'tests/load/results/graphql-load-summary.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

// Text summary helper
function textSummary(data, options) {
  const lines = [];
  lines.push('\n================== LOAD TEST SUMMARY ==================\n');

  // Overall metrics
  lines.push('Overall Results:');
  lines.push(`  Total Requests: ${data.metrics.http_reqs?.values?.count || 0}`);
  lines.push(`  Failed Requests: ${data.metrics.http_req_failed?.values?.passes || 0}`);
  lines.push(`  Error Rate: ${((data.metrics.errors?.values?.rate || 0) * 100).toFixed(2)}%`);
  lines.push('');

  // Latency percentiles
  lines.push('Latency Percentiles:');
  const httpDuration = data.metrics.http_req_duration?.values;
  if (httpDuration) {
    lines.push(`  p50: ${httpDuration.med?.toFixed(2) || 0}ms`);
    lines.push(`  p90: ${httpDuration['p(90)']?.toFixed(2) || 0}ms`);
    lines.push(`  p95: ${httpDuration['p(95)']?.toFixed(2) || 0}ms`);
    lines.push(`  p99: ${httpDuration['p(99)']?.toFixed(2) || 0}ms`);
  }
  lines.push('');

  // Threshold results
  lines.push('Threshold Results:');
  for (const [name, threshold] of Object.entries(data.metrics)) {
    if (threshold.thresholds) {
      for (const [rule, passed] of Object.entries(threshold.thresholds)) {
        const status = passed ? '✓' : '✗';
        lines.push(`  ${status} ${name}: ${rule}`);
      }
    }
  }

  lines.push('\n========================================================\n');
  return lines.join('\n');
}
