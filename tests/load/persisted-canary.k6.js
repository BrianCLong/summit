/**
 * K6 Load Test: Persisted Query + Canary Tenant Validation
 * Tests persisted query enforcement across log/enforce phases
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate } from 'k6/metrics';

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m', target: 30 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    persisted_query_success_rate: ['rate>0.8'],
    canary_operations_rate: ['rate>0'],
    log_phase_violations: ['count>0'], // Should see violations in log phase
  },
};

// Custom metrics
const persistedQuerySuccessRate = new Rate('persisted_query_success_rate');
const canaryOperationsRate = new Rate('canary_operations_rate');
const logPhaseViolations = new Counter('log_phase_violations');

// Base configuration
const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:4000';
const GRAPHQL_URL = `${BASE_URL}/graphql`;
const PQ_PHASE = __ENV.PQ_PHASE || 'log'; // 'log' or 'enforce'

// Canary tenant configurations
const CANARY_TENANTS = ['test', 'demo', 'maestro-internal'];
const PRODUCTION_TENANTS = ['prod-sample', 'customer-alpha'];

// Authentication headers
const AUTH_HEADERS = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${__ENV.TEST_TOKEN || 'test-token-canary'}`,
};

// Sample persisted queries (these would be in the allowlist)
const PERSISTED_MUTATIONS = [
  {
    hash: 'abc123def456789', // Mock hash
    query: `
      mutation CreateEntity($input: EntityInput!) {
        createEntity(input: $input) @budget(capUSD: 0.05, tokenCeiling: 1000) {
          id
          kind
          createdAt
        }
      }
    `,
    variables: {
      input: {
        tenantId: 'test',
        kind: 'TestEntity',
        labels: ['Test'],
        props: { source: 'k6-test' },
      },
    },
  },

  {
    hash: 'def456ghi789012',
    query: `
      mutation SafeNoop {
        ping @budget(capUSD: 0.01, tokenCeiling: 100)
      }
    `,
    variables: {},
  },
];

// Non-persisted mutation (should trigger violations)
const NON_PERSISTED_MUTATION = {
  query: `
    mutation UnpersistedTest($input: EntityInput!) {
      createEntity(input: $input) @budget(capUSD: 0.02, tokenCeiling: 500) {
        id
        kind
      }
    }
  `,
  variables: {
    input: {
      tenantId: 'test',
      kind: 'UnpersistedEntity',
      labels: ['Unpersisted'],
      props: { violation: true },
    },
  },
};

function randomChoice(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomTenant(canaryOnly = false) {
  const tenants = canaryOnly
    ? CANARY_TENANTS
    : [...CANARY_TENANTS, ...PRODUCTION_TENANTS];
  return randomChoice(tenants);
}

export default function () {
  const tenant = getRandomTenant();
  const isCanary = CANARY_TENANTS.includes(tenant);

  // Test persisted query (should always work)
  testPersistedQuery(tenant, isCanary);

  // Test non-persisted query (behavior depends on phase)
  testNonPersistedQuery(tenant, isCanary);

  // Test canary-specific operations
  if (isCanary) {
    testCanarySpecificOperations(tenant);
  }

  sleep(0.1);
}

function testPersistedQuery(tenant, isCanary) {
  const persistedMutation = randomChoice(PERSISTED_MUTATIONS);

  // Update tenant in variables
  if (persistedMutation.variables.input) {
    persistedMutation.variables.input.tenantId = tenant;
  }

  const payload = {
    query: persistedMutation.query,
    variables: persistedMutation.variables,
    extensions: {
      persistedQuery: {
        version: 1,
        sha256Hash: persistedMutation.hash,
      },
    },
  };

  const headers = {
    ...AUTH_HEADERS,
    'X-Tenant-ID': tenant,
    APQ: '1', // Indicate APQ support
  };

  const response = http.post(GRAPHQL_URL, JSON.stringify(payload), {
    headers,
    tags: {
      test_type: 'persisted_query',
      tenant,
      is_canary: isCanary,
      mutation:
        persistedMutation.query.match(/mutation\s+(\w+)/)?.[1] || 'unknown',
    },
  });

  const success = check(response, {
    'persisted query accepted': (r) => r.status === 200,
    'persisted query has data': (r) => {
      try {
        const data = JSON.parse(r.body);
        return !data.errors || data.errors.length === 0;
      } catch {
        return false;
      }
    },
  });

  persistedQuerySuccessRate.add(success);
}

function testNonPersistedQuery(tenant, isCanary) {
  // Update tenant in variables
  NON_PERSISTED_MUTATION.variables.input.tenantId = tenant;

  const headers = {
    ...AUTH_HEADERS,
    'X-Tenant-ID': tenant,
  };

  const response = http.post(
    GRAPHQL_URL,
    JSON.stringify(NON_PERSISTED_MUTATION),
    {
      headers,
      tags: {
        test_type: 'non_persisted_query',
        tenant,
        is_canary: isCanary,
        phase: PQ_PHASE,
      },
    },
  );

  if (PQ_PHASE === 'log') {
    // In log phase: should succeed but log violation
    const success = check(response, {
      'non-persisted accepted in log phase': (r) =>
        r.status === 200 || r.status === 400,
      'response has proper structure': (r) => {
        try {
          JSON.parse(r.body);
          return true;
        } catch {
          return false;
        }
      },
    });

    if (response.status === 200) {
      logPhaseViolations.add(1);
    }

    persistedQuerySuccessRate.add(success);
  } else {
    // In enforce phase: should be rejected for canaries, allowed for production
    let expectedSuccess;

    if (isCanary) {
      expectedSuccess = check(response, {
        'non-persisted rejected for canary in enforce phase': (r) =>
          r.status === 400,
        'proper error message': (r) => {
          try {
            const data = JSON.parse(r.body);
            return (
              data.errors &&
              data.errors.some((e) =>
                e.message.includes('Persisted queries required'),
              )
            );
          } catch {
            return false;
          }
        },
      });
    } else {
      // Non-canary tenants may still be allowed depending on configuration
      expectedSuccess = check(response, {
        'non-persisted handled appropriately for production': (r) =>
          r.status === 200 || r.status === 400,
      });
    }

    persistedQuerySuccessRate.add(expectedSuccess);
  }
}

function testCanarySpecificOperations(tenant) {
  // Test budget-aware operations for canaries
  const canaryMutation = {
    query: `
      mutation CanaryBudgetTest($input: EntityInput!) {
        createEntity(input: $input) @budget(capUSD: 5.00, tokenCeiling: 10000) {
          id
          kind
          props
        }
      }
    `,
    variables: {
      input: {
        tenantId: tenant,
        kind: 'CanaryHighBudget',
        labels: ['Canary', 'HighBudget'],
        props: {
          testType: 'budget_threshold',
          estimatedCost: 5.0,
        },
      },
    },
    extensions: {
      persistedQuery: {
        version: 1,
        sha256Hash: 'canary-budget-test-hash',
      },
    },
  };

  const headers = {
    ...AUTH_HEADERS,
    'X-Tenant-ID': tenant,
    'X-Risk-Tag': 'high_cost', // Should trigger four-eyes requirement
    APQ: '1',
  };

  const response = http.post(GRAPHQL_URL, JSON.stringify(canaryMutation), {
    headers,
    tags: {
      test_type: 'canary_budget_test',
      tenant,
      is_canary: true,
    },
  });

  const budgetHandled = check(response, {
    'canary budget operation handled': (r) => {
      // Should either succeed (if under budget) or be denied with proper error
      if (r.status === 200) return true;
      if (r.status === 403 || r.status === 429) {
        try {
          const data = JSON.parse(r.body);
          return (
            data.errors &&
            data.errors.some(
              (e) =>
                e.message.includes('budget') ||
                e.message.includes('Budget') ||
                e.message.includes('four-eyes'),
            )
          );
        } catch {
          return false;
        }
      }
      return false;
    },
    'proper canary tenant handling': (r) => r.status !== 500,
  });

  canaryOperationsRate.add(budgetHandled);
}

// Setup function to initialize test environment
export function setup() {
  console.log(`Starting persisted query + canary test`);
  console.log(`Phase: ${PQ_PHASE}`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Canary tenants: ${CANARY_TENANTS.join(', ')}`);

  // Optionally warm up the allowlist
  const warmupResponse = http.get(`${BASE_URL}/admin/persisted-queries`, {
    headers: AUTH_HEADERS,
  });

  if (warmupResponse.status === 200) {
    try {
      const stats = JSON.parse(warmupResponse.body);
      console.log(`Persisted query stats: ${JSON.stringify(stats)}`);
    } catch (e) {
      console.log('Could not parse persisted query stats');
    }
  }

  return {
    phase: PQ_PHASE,
    baseUrl: BASE_URL,
    canaryTenants: CANARY_TENANTS,
  };
}

// Teardown function with results summary
export function teardown(data) {
  console.log(`
    Persisted Query + Canary Test Results:
    - Phase: ${data.phase}
    - Persisted Query Success Rate: ${(persistedQuerySuccessRate.rate || 0) * 100}%
    - Canary Operations Rate: ${(canaryOperationsRate.rate || 0) * 100}%
    - Log Phase Violations: ${logPhaseViolations.count || 0}
    
    Expected Results:
    - Log Phase: Should see violations but operations succeed
    - Enforce Phase: Canaries should reject non-persisted, production may allow
  `);
}
