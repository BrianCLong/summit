import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics for IntelGraph SLO tracking
const errorRate = new Rate('errors');

export const options = {
  scenarios: {
    // Sprint 0 SLO validation: Read QPS 50, entityById p95 ≤ 350ms
    entity_by_id: {
      executor: 'constant-arrival-rate',
      rate: 50, // 50 requests per second
      timeUnit: '1s',
      duration: '2m',
      preAllocatedVUs: 20,
      tags: { scenario: 'entity_by_id' },
    },

    // Path queries: 2-3 hops p95 ≤ 1200ms
    path_between: {
      executor: 'constant-arrival-rate',
      rate: 10, // Lower rate for complex queries
      timeUnit: '1s',
      duration: '2m',
      preAllocatedVUs: 10,
      startTime: '30s', // Stagger start
      tags: { scenario: 'path_between' },
    },

    // Search queries with mixed complexity
    search_entities: {
      executor: 'constant-arrival-rate',
      rate: 25,
      timeUnit: '1s',
      duration: '2m',
      preAllocatedVUs: 15,
      startTime: '1m',
      tags: { scenario: 'search_entities' },
    },
  },

  thresholds: {
    // SLO enforcement: p95 thresholds from conductor summary
    'http_req_duration{scenario:entity_by_id}': ['p(95)<350'],
    'http_req_duration{scenario:path_between}': ['p(95)<1200'],
    'http_req_duration{scenario:search_entities}': ['p(95)<350'],

    // Error rate thresholds
    errors: ['rate<0.02'], // < 2% error rate
    http_req_failed: ['rate<0.01'], // < 1% failure rate
  },
};

// Test data for realistic queries
const testEntityIds = [
  'demo:entity-001',
  'demo:entity-002',
  'demo:entity-003',
  'demo:entity-004',
  'demo:entity-005',
];

const searchQueries = [
  'suspicious',
  'malware',
  'phishing',
  'threat',
  'indicator',
  'entity',
];

export default function () {
  const baseUrl = __ENV.API_URL || 'http://localhost:4001';
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${__ENV.TEST_TOKEN || 'dev-token'}`,
  };

  const scenario = __ENV.K6_SCENARIO || 'entity_by_id';

  switch (scenario) {
    case 'entity_by_id':
      testEntityById(baseUrl, headers);
      break;
    case 'path_between':
      testPathBetween(baseUrl, headers);
      break;
    case 'search_entities':
      testSearchEntities(baseUrl, headers);
      break;
    default:
      testEntityById(baseUrl, headers);
  }

  sleep(0.1); // Small delay between requests
}

function testEntityById(baseUrl, headers) {
  const entityId =
    testEntityIds[Math.floor(Math.random() * testEntityIds.length)];

  // Use persisted query for better performance
  const query = `
    query GetEntityById($id: ID!) {
      entityById(id: $id) {
        id
        type
        name
        degree
        confidence
        createdAt
        sources {
          id
          system
          collectedAt
        }
      }
    }
  `;

  const payload = JSON.stringify({
    query,
    variables: { id: entityId },
    extensions: {
      persistedQuery: {
        version: 1,
        sha256Hash: 'getEntityById', // Use named query for dev
      },
    },
  });

  const response = http.post(`${baseUrl}/graphql`, payload, { headers });

  const success = check(response, {
    'entityById status is 200': (r) => r.status === 200,
    'entityById returns data': (r) => {
      const body = JSON.parse(r.body);
      return body.data && body.data.entityById;
    },
    'entityById response time < 350ms': (r) => r.timings.duration < 350,
  });

  if (!success) {
    errorRate.add(1);
  } else {
    errorRate.add(0);
  }
}

function testPathBetween(baseUrl, headers) {
  const fromId =
    testEntityIds[Math.floor(Math.random() * testEntityIds.length)];
  const toId = testEntityIds[Math.floor(Math.random() * testEntityIds.length)];

  if (fromId === toId) return; // Skip same entity paths

  const query = `
    query PathBetween($fromId: ID!, $toId: ID!, $maxHops: Int) {
      pathBetween(fromId: $fromId, toId: $toId, maxHops: $maxHops) {
        from
        to
        relType
        score
      }
    }
  `;

  const payload = JSON.stringify({
    query,
    variables: {
      fromId,
      toId,
      maxHops: 3, // Enforce SLO constraint
    },
    extensions: {
      persistedQuery: {
        version: 1,
        sha256Hash: 'pathBetween',
      },
    },
  });

  const response = http.post(`${baseUrl}/graphql`, payload, { headers });

  const success = check(response, {
    'pathBetween status is 200': (r) => r.status === 200,
    'pathBetween returns data': (r) => {
      const body = JSON.parse(r.body);
      return body.data && Array.isArray(body.data.pathBetween);
    },
    'pathBetween response time < 1200ms': (r) => r.timings.duration < 1200,
    'pathBetween enforces 3-hop limit': (r) => {
      const body = JSON.parse(r.body);
      if (body.data && body.data.pathBetween) {
        return body.data.pathBetween.length <= 3;
      }
      return true;
    },
  });

  if (!success) {
    errorRate.add(1);
  } else {
    errorRate.add(0);
  }
}

function testSearchEntities(baseUrl, headers) {
  const searchQuery =
    searchQueries[Math.floor(Math.random() * searchQueries.length)];

  const query = `
    query SearchEntities($query: String!, $filter: EntityFilter, $pagination: PaginationInput) {
      searchEntities(query: $query, filter: $filter, pagination: $pagination) {
        entities {
          id
          type
          name
          degree
          purpose
        }
        totalCount
        hasMore
      }
    }
  `;

  const payload = JSON.stringify({
    query,
    variables: {
      query: searchQuery,
      pagination: { limit: 25, offset: 0 },
    },
    extensions: {
      persistedQuery: {
        version: 1,
        sha256Hash: 'searchEntities',
      },
    },
  });

  const response = http.post(`${baseUrl}/graphql`, payload, { headers });

  const success = check(response, {
    'searchEntities status is 200': (r) => r.status === 200,
    'searchEntities returns data': (r) => {
      const body = JSON.parse(r.body);
      return (
        body.data &&
        body.data.searchEntities &&
        Array.isArray(body.data.searchEntities.entities)
      );
    },
    'searchEntities response time < 350ms': (r) => r.timings.duration < 350,
    'searchEntities respects pagination': (r) => {
      const body = JSON.parse(r.body);
      if (body.data && body.data.searchEntities) {
        return body.data.searchEntities.entities.length <= 25;
      }
      return true;
    },
  });

  if (!success) {
    errorRate.add(1);
  } else {
    errorRate.add(0);
  }
}

// Summary handler for SLO reporting
export function handleSummary(data) {
  const summary = {
    timestamp: new Date().toISOString(),
    test_type: 'intelgraph_api_performance',
    environment: __ENV.TEST_ENVIRONMENT || 'dev',

    slo_validation: {
      entity_by_id_p95_ms:
        data.metrics['http_req_duration{scenario:entity_by_id}'].values.p95,
      path_between_p95_ms:
        data.metrics['http_req_duration{scenario:path_between}'].values.p95,
      search_entities_p95_ms:
        data.metrics['http_req_duration{scenario:search_entities}'].values.p95,

      // SLO compliance
      entity_by_id_slo_met:
        data.metrics['http_req_duration{scenario:entity_by_id}'].values.p95 <
        350,
      path_between_slo_met:
        data.metrics['http_req_duration{scenario:path_between}'].values.p95 <
        1200,
      search_entities_slo_met:
        data.metrics['http_req_duration{scenario:search_entities}'].values.p95 <
        350,

      error_rate: data.metrics.errors.values.rate,
      failure_rate: data.metrics.http_req_failed.values.rate,
    },

    performance_metrics: {
      total_requests: data.metrics.http_reqs.values.count,
      avg_response_time_ms: data.metrics.http_req_duration.values.avg,
      p95_response_time_ms: data.metrics.http_req_duration.values.p95,
      p99_response_time_ms: data.metrics.http_req_duration.values.p99,
      throughput_rps: data.metrics.http_reqs.values.rate,
    },
  };

  // Output for CI/CD pipeline consumption
  return {
    'k6-summary.json': JSON.stringify(summary, null, 2),
    stdout: `
🎯 IntelGraph API Performance Test Results
==========================================

SLO Compliance:
• entityById p95: ${summary.slo_validation.entity_by_id_p95_ms.toFixed(1)}ms (SLO: <350ms) ${summary.slo_validation.entity_by_id_slo_met ? '✅' : '❌'}
• pathBetween p95: ${summary.slo_validation.path_between_p95_ms.toFixed(1)}ms (SLO: <1200ms) ${summary.slo_validation.path_between_slo_met ? '✅' : '❌'}
• searchEntities p95: ${summary.slo_validation.search_entities_p95_ms.toFixed(1)}ms (SLO: <350ms) ${summary.slo_validation.search_entities_slo_met ? '✅' : '❌'}

Error Rates:
• Overall error rate: ${(summary.slo_validation.error_rate * 100).toFixed(2)}% (Target: <2%)
• HTTP failure rate: ${(summary.slo_validation.failure_rate * 100).toFixed(2)}% (Target: <1%)

Performance:
• Total requests: ${summary.performance_metrics.total_requests}
• Throughput: ${summary.performance_metrics.throughput_rps.toFixed(1)} req/s
• Average response: ${summary.performance_metrics.avg_response_time_ms.toFixed(1)}ms
• P99 response: ${summary.performance_metrics.p99_response_time_ms.toFixed(1)}ms
    `,
  };
}
