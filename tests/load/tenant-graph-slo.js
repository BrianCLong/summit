/**
 * Tenant Graph Slice v0 - k6 Load Tests
 * Validates SLO compliance under load
 *
 * SLO Targets:
 * - searchEntities: p95 ≤ 350ms
 * - neighbors (1-hop): p95 ≤ 300ms
 * - neighbors (2-hop): p95 ≤ 1200ms
 * - 99.9% availability monthly
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const searchLatency = new Trend('search_latency', true);
const neighbors1HopLatency = new Trend('neighbors_1hop_latency', true);
const neighbors2HopLatency = new Trend('neighbors_2hop_latency', true);
const errorRate = new Rate('error_rate');
const sloViolationRate = new Rate('slo_violation_rate');

// Configuration
const API_URL = __ENV.API_URL || 'http://localhost:4000/graphql';
const TENANT_ID = __ENV.TENANT_ID || 'demo-tenant-001';

export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Warm-up
    { duration: '2m', target: 50 },   // Ramp to 50 VUs
    { duration: '5m', target: 100 },  // Sustained load at 100 VUs
    { duration: '2m', target: 200 },  // Peak load
    { duration: '1m', target: 0 },    // Ramp down
  ],
  thresholds: {
    'http_req_failed': ['rate<0.001'],  // 99.9% availability
    'search_latency': ['p(95)<350'],    // Search SLO
    'neighbors_1hop_latency': ['p(95)<300'],  // 1-hop SLO
    'neighbors_2hop_latency': ['p(95)<1200'], // 2-hop SLO
    'slo_violation_rate': ['rate<0.05'], // <5% SLO violations acceptable
  },
};

// Sample search queries
const searchTerms = [
  'Alice', 'Bob', 'Tech', 'Finance', 'Global', 'Strategic',
  'Innovations', 'Solutions', 'Advanced', 'Digital'
];

// Sample entity IDs (will be populated from search results)
let entityIds = [];

export function setup() {
  console.log('🚀 Starting Tenant Graph SLO validation tests');
  console.log(`API: ${API_URL}`);
  console.log(`Tenant: ${TENANT_ID}`);

  // Warm-up query to populate entity IDs
  const warmupQuery = {
    query: `query Warmup($tenantId: ID!) {
      searchEntities(tenantId: $tenantId, q: "Alice", limit: 100) {
        entities { id }
        total
      }
    }`,
    variables: { tenantId: TENANT_ID }
  };

  const res = http.post(API_URL, JSON.stringify(warmupQuery), {
    headers: { 'Content-Type': 'application/json' },
  });

  if (res.status === 200) {
    const body = JSON.parse(res.body);
    if (body.data && body.data.searchEntities) {
      entityIds = body.data.searchEntities.entities.map(e => e.id);
      console.log(`Found ${entityIds.length} entities for testing`);
    }
  }

  return { entityIds };
}

export default function(data) {
  // Use passed entity IDs or populate from data
  if (data && data.entityIds && data.entityIds.length > 0) {
    entityIds = data.entityIds;
  }

  const scenario = Math.random();

  if (scenario < 0.5) {
    // 50%: Search queries
    testSearch();
  } else if (scenario < 0.8) {
    // 30%: 1-hop neighbor queries
    testNeighbors1Hop();
  } else {
    // 20%: 2-hop neighbor queries
    testNeighbors2Hop();
  }

  sleep(Math.random() * 2); // Random think time
}

function testSearch() {
  const searchTerm = searchTerms[Math.floor(Math.random() * searchTerms.length)];

  const query = {
    query: `query Search($tenantId: ID!, $q: String!) {
      searchEntities(tenantId: $tenantId, q: $q, limit: 25) {
        entities {
          id
          labels
        }
        total
        took
      }
    }`,
    variables: {
      tenantId: TENANT_ID,
      q: searchTerm
    }
  };

  const startTime = Date.now();
  const res = http.post(API_URL, JSON.stringify(query), {
    headers: { 'Content-Type': 'application/json' },
    tags: { operation: 'search' },
  });
  const duration = Date.now() - startTime;

  const success = check(res, {
    'search: status is 200': (r) => r.status === 200,
    'search: has data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data && body.data.searchEntities;
      } catch {
        return false;
      }
    },
  });

  errorRate.add(!success);

  if (success) {
    const body = JSON.parse(res.body);
    const took = body.data.searchEntities.took || duration;
    searchLatency.add(took);

    const violatesSLO = took > 350;
    sloViolationRate.add(violatesSLO);

    if (violatesSLO) {
      console.log(`⚠️  Search SLO violation: ${took}ms > 350ms`);
    }

    // Update entity IDs for later tests
    if (body.data.searchEntities.entities.length > 0) {
      const newIds = body.data.searchEntities.entities.map(e => e.id);
      entityIds = [...new Set([...entityIds, ...newIds])].slice(0, 1000); // Keep top 1000
    }
  }
}

function testNeighbors1Hop() {
  if (entityIds.length === 0) {
    return; // Skip if no entities
  }

  const entityId = entityIds[Math.floor(Math.random() * entityIds.length)];

  const query = {
    query: `query Neighbors1($id: ID!, $tenantId: ID!) {
      neighbors(id: $id, tenantId: $tenantId, hops: 1, limit: 50) {
        entities { id }
        relationships { id }
        total
        took
      }
    }`,
    variables: {
      id: entityId,
      tenantId: TENANT_ID
    }
  };

  const startTime = Date.now();
  const res = http.post(API_URL, JSON.stringify(query), {
    headers: { 'Content-Type': 'application/json' },
    tags: { operation: 'neighbors_1hop' },
  });
  const duration = Date.now() - startTime;

  const success = check(res, {
    'neighbors-1: status is 200': (r) => r.status === 200,
    'neighbors-1: has data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data && body.data.neighbors;
      } catch {
        return false;
      }
    },
  });

  errorRate.add(!success);

  if (success) {
    const body = JSON.parse(res.body);
    const took = body.data.neighbors.took || duration;
    neighbors1HopLatency.add(took);

    const violatesSLO = took > 300;
    sloViolationRate.add(violatesSLO);

    if (violatesSLO) {
      console.log(`⚠️  1-hop neighbors SLO violation: ${took}ms > 300ms`);
    }
  }
}

function testNeighbors2Hop() {
  if (entityIds.length === 0) {
    return;
  }

  const entityId = entityIds[Math.floor(Math.random() * entityIds.length)];

  const query = {
    query: `query Neighbors2($id: ID!, $tenantId: ID!) {
      neighbors(id: $id, tenantId: $tenantId, hops: 2, limit: 50) {
        entities { id }
        relationships { id }
        total
        took
      }
    }`,
    variables: {
      id: entityId,
      tenantId: TENANT_ID
    }
  };

  const startTime = Date.now();
  const res = http.post(API_URL, JSON.stringify(query), {
    headers: { 'Content-Type': 'application/json' },
    tags: { operation: 'neighbors_2hop' },
  });
  const duration = Date.now() - startTime;

  const success = check(res, {
    'neighbors-2: status is 200': (r) => r.status === 200,
    'neighbors-2: has data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data && body.data.neighbors;
      } catch {
        return false;
      }
    },
  });

  errorRate.add(!success);

  if (success) {
    const body = JSON.parse(res.body);
    const took = body.data.neighbors.took || duration;
    neighbors2HopLatency.add(took);

    const violatesSLO = took > 1200;
    sloViolationRate.add(violatesSLO);

    if (violatesSLO) {
      console.log(`⚠️  2-hop neighbors SLO violation: ${took}ms > 1200ms`);
    }
  }
}

export function teardown(data) {
  console.log('✅ SLO validation tests completed');
}
