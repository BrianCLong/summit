/**
 * K6 Load Testing Profiles for IntelGraph GA Performance Validation
 *
 * Tests SLO compliance at 2x expected capacity:
 * - GraphQL reads p95 ≤350ms
 * - GraphQL writes p95 ≤700ms
 * - Neo4j 1-hop p95 ≤300ms
 * - Neo4j 2-3 hop p95 ≤1,200ms
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { randomIntBetween, randomItem } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Custom metrics for SLO tracking
const sloViolationRate = new Rate('slo_violations');
const graphqlReadLatency = new Trend('graphql_read_latency');
const graphqlWriteLatency = new Trend('graphql_write_latency');
const neo4jOneHopLatency = new Trend('neo4j_1hop_latency');
const neo4jMultiHopLatency = new Trend('neo4j_multihop_latency');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_TOKEN = __ENV.API_TOKEN || 'test-token';

// Test data sets
const TENANT_IDS = ['tenant-alpha', 'tenant-beta', 'tenant-gamma'];
const USER_IDS = ['user-1', 'user-2', 'user-3', 'user-4', 'user-5'];
const ENTITY_TYPES = ['Person', 'Organization', 'Location', 'Document', 'Event'];
const SEARCH_TERMS = [
  'intelligence report',
  'financial transaction',
  'corporate meeting',
  'security incident',
  'data analysis'
];

// Load profile configurations
export const options = {
  scenarios: {
    // Scenario 1: Baseline load - normal operation
    baseline_load: {
      executor: 'constant-vus',
      vus: 10,
      duration: '5m',
      tags: { scenario: 'baseline' },
      exec: 'baselineTest'
    },

    // Scenario 2: Peak load - 2x expected capacity
    peak_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },  // Ramp up
        { duration: '10m', target: 50 }, // Sustained peak
        { duration: '2m', target: 0 }   // Ramp down
      ],
      tags: { scenario: 'peak' },
      exec: 'peakTest'
    },

    // Scenario 3: Spike load - sudden traffic increase
    spike_load: {
      executor: 'ramping-vus',
      startVUs: 10,
      stages: [
        { duration: '1m', target: 10 },  // Normal load
        { duration: '30s', target: 100 }, // Spike
        { duration: '2m', target: 100 },  // Hold spike
        { duration: '30s', target: 10 },  // Return to normal
        { duration: '1m', target: 10 }   // Stabilize
      ],
      tags: { scenario: 'spike' },
      exec: 'spikeTest'
    },

    // Scenario 4: Stress test - find breaking point
    stress_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },
        { duration: '5m', target: 100 },
        { duration: '2m', target: 150 },
        { duration: '5m', target: 200 },
        { duration: '2m', target: 250 },
        { duration: '5m', target: 300 },
        { duration: '2m', target: 0 }
      ],
      tags: { scenario: 'stress' },
      exec: 'stressTest'
    },

    // Scenario 5: NLQ intensive - test natural language processing
    nlq_intensive: {
      executor: 'constant-arrival-rate',
      rate: 30, // 30 requests per second
      timeUnit: '1s',
      duration: '10m',
      preAllocatedVUs: 20,
      maxVUs: 50,
      tags: { scenario: 'nlq' },
      exec: 'nlqIntensiveTest'
    }
  },

  thresholds: {
    // SLO thresholds
    'http_req_duration{group:graphql_read}': ['p(95)<350'],
    'http_req_duration{group:graphql_write}': ['p(95)<700'],
    'http_req_duration{group:neo4j_1hop}': ['p(95)<300'],
    'http_req_duration{group:neo4j_multihop}': ['p(95)<1200'],

    // Error rate thresholds
    'http_req_failed': ['rate<0.01'], // <1% error rate
    'slo_violations': ['rate<0.05'],  // <5% SLO violations

    // Performance thresholds
    'http_req_duration': ['p(95)<2000', 'p(99)<5000'],
    'http_req_waiting': ['p(95)<1500'],

    // Custom metric thresholds
    'graphql_read_latency': ['p(95)<350'],
    'graphql_write_latency': ['p(95)<700'],
    'neo4j_1hop_latency': ['p(95)<300'],
    'neo4j_multihop_latency': ['p(95)<1200']
  }
};

// Utility functions
function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_TOKEN}`,
    'X-Tenant-ID': randomItem(TENANT_IDS),
    'X-User-ID': randomItem(USER_IDS)
  };
}

function executeGraphQL(query, variables = {}, operationName = null) {
  const payload = JSON.stringify({
    query,
    variables,
    operationName
  });

  const response = http.post(`${BASE_URL}/graphql`, payload, {
    headers: getHeaders()
  });

  return response;
}

function checkSLO(response, threshold, metricName) {
  const duration = response.timings.duration;
  const violation = duration > threshold;

  if (violation) {
    sloViolationRate.add(1);
    console.warn(`SLO violation: ${metricName} took ${duration}ms (threshold: ${threshold}ms)`);
  } else {
    sloViolationRate.add(0);
  }

  return !violation;
}

// GraphQL queries for testing
const QUERIES = {
  // Read operations
  GET_ENTITY: `
    query GetEntity($id: ID!) {
      entity(id: $id) {
        id
        type
        properties
        createdAt
        updatedAt
      }
    }
  `,

  SEARCH_ENTITIES: `
    query SearchEntities($searchTerm: String!, $limit: Int) {
      searchEntities(searchTerm: $searchTerm, limit: $limit) {
        id
        type
        properties
        score
      }
    }
  `,

  GET_ENTITY_RELATIONSHIPS: `
    query GetEntityRelationships($id: ID!, $depth: Int) {
      entity(id: $id) {
        id
        relationships(depth: $depth) {
          id
          type
          target {
            id
            type
            properties
          }
          properties
        }
      }
    }
  `,

  EXECUTE_NLQ: `
    query ExecuteNLQ($query: String!, $context: NLQContext) {
      executeNaturalLanguageQuery(query: $query, context: $context) {
        results {
          entities {
            id
            type
            properties
          }
          relationships {
            id
            type
            source
            target
            properties
          }
        }
        cypher
        executionTime
        cached
      }
    }
  `,

  GET_ANALYTICS: `
    query GetAnalytics($timeRange: TimeRange!) {
      analytics(timeRange: $timeRange) {
        entityCount
        relationshipCount
        topEntityTypes {
          type
          count
        }
        topRelationshipTypes {
          type
          count
        }
      }
    }
  `,

  // Write operations
  CREATE_ENTITY: `
    mutation CreateEntity($input: EntityInput!) {
      createEntity(input: $input) {
        id
        type
        properties
        createdAt
      }
    }
  `,

  UPDATE_ENTITY: `
    mutation UpdateEntity($id: ID!, $input: EntityUpdateInput!) {
      updateEntity(id: $id, input: $input) {
        id
        type
        properties
        updatedAt
      }
    }
  `,

  CREATE_RELATIONSHIP: `
    mutation CreateRelationship($input: RelationshipInput!) {
      createRelationship(input: $input) {
        id
        type
        source
        target
        properties
        createdAt
      }
    }
  `
};

// Test scenarios
export function baselineTest() {
  group('Baseline Load Test', () => {
    // Mix of read and write operations (80/20 split)
    const operations = [
      { weight: 40, func: testEntityRead },
      { weight: 20, func: testEntitySearch },
      { weight: 15, func: testRelationshipTraversal },
      { weight: 10, func: testNLQuery },
      { weight: 10, func: testEntityWrite },
      { weight: 5, func: testAnalytics }
    ];

    const operation = weightedChoice(operations);
    operation.func();

    sleep(randomIntBetween(1, 3));
  });
}

export function peakTest() {
  group('Peak Load Test', () => {
    // Higher frequency of operations
    const operations = [
      { weight: 35, func: testEntityRead },
      { weight: 25, func: testEntitySearch },
      { weight: 15, func: testRelationshipTraversal },
      { weight: 15, func: testNLQuery },
      { weight: 7, func: testEntityWrite },
      { weight: 3, func: testAnalytics }
    ];

    const operation = weightedChoice(operations);
    operation.func();

    sleep(randomIntBetween(0.5, 2));
  });
}

export function spikeTest() {
  group('Spike Load Test', () => {
    // Read-heavy during spikes
    const operations = [
      { weight: 50, func: testEntityRead },
      { weight: 30, func: testEntitySearch },
      { weight: 20, func: testRelationshipTraversal }
    ];

    const operation = weightedChoice(operations);
    operation.func();

    sleep(randomIntBetween(0.1, 1));
  });
}

export function stressTest() {
  group('Stress Test', () => {
    // All types of operations under stress
    const operations = [
      { weight: 30, func: testEntityRead },
      { weight: 25, func: testEntitySearch },
      { weight: 20, func: testRelationshipTraversal },
      { weight: 15, func: testNLQuery },
      { weight: 7, func: testEntityWrite },
      { weight: 3, func: testAnalytics }
    ];

    const operation = weightedChoice(operations);
    operation.func();

    sleep(randomIntBetween(0.1, 0.5));
  });
}

export function nlqIntensiveTest() {
  group('NLQ Intensive Test', () => {
    // Focus on natural language query processing
    testNLQuery();
    sleep(randomIntBetween(0.5, 1.5));
  });
}

// Individual test functions
function testEntityRead() {
  group('Entity Read (1-hop)', () => {
    const entityId = `entity-${randomIntBetween(1, 1000)}`;
    const response = executeGraphQL(QUERIES.GET_ENTITY, { id: entityId });

    const passed = check(response, {
      'status is 200': (r) => r.status === 200,
      'response time < 350ms': (r) => r.timings.duration < 350,
      'no GraphQL errors': (r) => !JSON.parse(r.body).errors
    });

    graphqlReadLatency.add(response.timings.duration);
    neo4jOneHopLatency.add(response.timings.duration);
    checkSLO(response, 350, 'GraphQL Read');
  });
}

function testEntitySearch() {
  group('Entity Search', () => {
    const searchTerm = randomItem(SEARCH_TERMS);
    const response = executeGraphQL(QUERIES.SEARCH_ENTITIES, {
      searchTerm,
      limit: 50
    });

    const passed = check(response, {
      'status is 200': (r) => r.status === 200,
      'response time < 350ms': (r) => r.timings.duration < 350,
      'returns results': (r) => {
        const data = JSON.parse(r.body);
        return data.data && Array.isArray(data.data.searchEntities);
      }
    });

    graphqlReadLatency.add(response.timings.duration);
    checkSLO(response, 350, 'Entity Search');
  });
}

function testRelationshipTraversal() {
  group('Relationship Traversal (2-3 hop)', () => {
    const entityId = `entity-${randomIntBetween(1, 1000)}`;
    const depth = randomIntBetween(2, 3);

    const response = executeGraphQL(QUERIES.GET_ENTITY_RELATIONSHIPS, {
      id: entityId,
      depth
    });

    const threshold = depth === 1 ? 300 : 1200;

    const passed = check(response, {
      'status is 200': (r) => r.status === 200,
      [`response time < ${threshold}ms`]: (r) => r.timings.duration < threshold,
      'returns relationships': (r) => {
        const data = JSON.parse(r.body);
        return data.data && data.data.entity;
      }
    });

    if (depth === 1) {
      neo4jOneHopLatency.add(response.timings.duration);
    } else {
      neo4jMultiHopLatency.add(response.timings.duration);
    }

    checkSLO(response, threshold, `${depth}-hop Traversal`);
  });
}

function testNLQuery() {
  group('Natural Language Query', () => {
    const nlQueries = [
      'Show me all organizations connected to financial transactions',
      'Find people who attended meetings with executives',
      'What are the most common document types in the database?',
      'Show me entities created in the last week',
      'Find all relationships involving security incidents'
    ];

    const query = randomItem(nlQueries);
    const response = executeGraphQL(QUERIES.EXECUTE_NLQ, {
      query,
      context: {
        tenantId: randomItem(TENANT_IDS),
        maxResults: 100
      }
    });

    const passed = check(response, {
      'status is 200': (r) => r.status === 200,
      'response time < 2000ms': (r) => r.timings.duration < 2000, // NLQ has higher threshold
      'returns Cypher query': (r) => {
        const data = JSON.parse(r.body);
        return data.data && data.data.executeNaturalLanguageQuery &&
               data.data.executeNaturalLanguageQuery.cypher;
      }
    });

    graphqlReadLatency.add(response.timings.duration);
    checkSLO(response, 2000, 'NL Query');
  });
}

function testEntityWrite() {
  group('Entity Write', () => {
    const entityData = {
      type: randomItem(ENTITY_TYPES),
      properties: {
        name: `Test Entity ${randomIntBetween(1, 10000)}`,
        description: 'Load testing entity',
        category: randomItem(['A', 'B', 'C']),
        priority: randomIntBetween(1, 5)
      }
    };

    const response = executeGraphQL(QUERIES.CREATE_ENTITY, {
      input: entityData
    });

    const passed = check(response, {
      'status is 200': (r) => r.status === 200,
      'response time < 700ms': (r) => r.timings.duration < 700,
      'entity created': (r) => {
        const data = JSON.parse(r.body);
        return data.data && data.data.createEntity && data.data.createEntity.id;
      }
    });

    graphqlWriteLatency.add(response.timings.duration);
    checkSLO(response, 700, 'GraphQL Write');
  });
}

function testAnalytics() {
  group('Analytics Query', () => {
    const response = executeGraphQL(QUERIES.GET_ANALYTICS, {
      timeRange: {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString()
      }
    });

    const passed = check(response, {
      'status is 200': (r) => r.status === 200,
      'response time < 1500ms': (r) => r.timings.duration < 1500,
      'returns analytics': (r) => {
        const data = JSON.parse(r.body);
        return data.data && data.data.analytics;
      }
    });

    graphqlReadLatency.add(response.timings.duration);
    checkSLO(response, 1500, 'Analytics');
  });
}

// Utility function for weighted choice
function weightedChoice(options) {
  const totalWeight = options.reduce((sum, opt) => sum + opt.weight, 0);
  let random = Math.random() * totalWeight;

  for (const option of options) {
    random -= option.weight;
    if (random <= 0) {
      return option;
    }
  }

  return options[options.length - 1];
}

// Setup and teardown
export function setup() {
  console.log('Starting IntelGraph load tests...');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Tenant IDs: ${TENANT_IDS.join(', ')}`);

  // Warm up the system
  const warmupResponse = executeGraphQL(QUERIES.GET_ENTITY, { id: 'warmup-entity' });
  console.log(`Warmup request completed in ${warmupResponse.timings.duration}ms`);

  return {
    startTime: Date.now()
  };
}

export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  console.log(`Load test completed in ${duration} seconds`);
}

// Handle summary for custom reporting
export function handleSummary(data) {
  return {
    'load-test-results.json': JSON.stringify(data, null, 2),
    'slo-report.html': generateSLOReport(data)
  };
}

function generateSLOReport(data) {
  const sloResults = {
    graphqlReads: data.metrics.graphql_read_latency,
    graphqlWrites: data.metrics.graphql_write_latency,
    neo4jOneHop: data.metrics.neo4j_1hop_latency,
    neo4jMultiHop: data.metrics.neo4j_multihop_latency,
    sloViolations: data.metrics.slo_violations
  };

  return `
<!DOCTYPE html>
<html>
<head>
    <title>IntelGraph SLO Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .metric { margin: 10px 0; padding: 10px; border: 1px solid #ddd; }
        .pass { background-color: #d4edda; }
        .fail { background-color: #f8d7da; }
        .threshold { font-weight: bold; }
    </style>
</head>
<body>
    <h1>IntelGraph SLO Performance Report</h1>
    <p>Generated: ${new Date().toISOString()}</p>

    <h2>SLO Compliance</h2>
    ${Object.entries(sloResults).map(([key, metric]) => `
        <div class="metric ${metric.p95 <= getThreshold(key) ? 'pass' : 'fail'}">
            <h3>${key}</h3>
            <p>P95: ${metric.p95?.toFixed(2)}ms</p>
            <p>P99: ${metric.p99?.toFixed(2)}ms</p>
            <p class="threshold">Threshold: ${getThreshold(key)}ms</p>
        </div>
    `).join('')}

    <h2>Summary</h2>
    <p>Total Requests: ${data.metrics.http_reqs?.count || 0}</p>
    <p>Error Rate: ${((data.metrics.http_req_failed?.rate || 0) * 100).toFixed(2)}%</p>
    <p>SLO Violation Rate: ${((data.metrics.slo_violations?.rate || 0) * 100).toFixed(2)}%</p>
</body>
</html>
  `;
}

function getThreshold(metricKey) {
  const thresholds = {
    graphqlReads: 350,
    graphqlWrites: 700,
    neo4jOneHop: 300,
    neo4jMultiHop: 1200,
    sloViolations: 50 // violations per 1000 requests
  };
  return thresholds[metricKey] || 1000;
}