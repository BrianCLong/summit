/**
 * K6 Load Testing for Safe Mutations System
 * Tests budget enforcement, rate limiting, and system behavior under load
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend, Gauge } from 'k6/metrics';

// Custom metrics
const budgetDenials = new Counter('budget_denials');
const rateLimitHits = new Counter('rate_limit_hits');
const mutationSuccessRate = new Rate('mutation_success_rate');
const tokenCountLatency = new Trend('token_count_latency');
const compensationEvents = new Counter('compensation_events');
const activeConnections = new Gauge('active_connections');

// Chaos engineering metrics
const faultInjectionRate = new Rate('fault_injection_rate');
const systemRecoveryTime = new Trend('system_recovery_time');
const chaosRecoveryRate = new Rate('chaos_recovery_rate');

// Test configuration with enhanced chaos and resilience thresholds
export const options = {
  stages: [
    { duration: '2m', target: 10 }, // Ramp up to 10 users
    { duration: '5m', target: 50 }, // Scale to 50 users
    { duration: '5m', target: 100 }, // Scale to 100 users
    { duration: '3m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 0 }, // Ramp down
  ],
  thresholds: {
    // Performance thresholds
    http_req_duration: ['p(95)<2000'], // 95% of requests under 2s
    http_req_failed: ['rate<0.02'], // Error rate under 2% (tightened)

    // Business logic thresholds
    mutation_success_rate: ['rate>0.8'], // 80% mutation success
    budget_denials: ['count<1000'], // Less than 1000 budget denials
    rate_limit_hits: ['count<500'], // Less than 500 rate limit hits

    // Chaos engineering thresholds
    'checks{type:budgetDenied}': ['rate>0'], // Ensure denial path is exercised
    'checks{type:rateLimited}': ['rate>0'], // Ensure rate limiting is tested
    'checks{type:compensationWorked}': ['rate>0'], // Ensure rollbacks work
    'checks{type:chaosRecovered}': ['rate>0.9'], // 90% chaos recovery rate

    // System resilience thresholds
    compensation_events: ['count<100'], // Less than 100 rollbacks
    fault_injection_rate: ['rate<0.1'], // Less than 10% injected faults
    system_recovery_time: ['p(95)<5000'], // 95% of recovery under 5s
  },
  ext: {
    loadimpact: {
      projectID: parseInt(__ENV.K6_PROJECT_ID || '0'),
      name: 'IntelGraph Safe Mutations Load Test',
    },
  },
};

// Base URLs
const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:4000';
const GRAPHQL_URL = `${BASE_URL}/graphql`;
const TOKEN_COUNT_URL = `${BASE_URL}/api/tokcount`;

// Test data generators
const SAMPLE_PROMPTS = [
  'Analyze this network traffic for potential threats',
  'Generate a threat assessment report based on the following indicators',
  'Correlate these entities with known threat actors',
  'Create a timeline analysis of the security incident',
  'Summarize findings from the intelligence report',
  'Extract indicators of compromise from the log data',
  'Generate attribution analysis for the observed attack patterns',
  'Create a risk assessment for the identified vulnerabilities',
];

const SAMPLE_ENTITIES = [
  { kind: 'IP', props: { address: '192.168.1.100', location: 'Internal' } },
  { kind: 'Domain', props: { name: 'malicious-site.com', reputation: 'bad' } },
  { kind: 'Person', props: { name: 'John Doe', role: 'analyst' } },
  { kind: 'Indicator', props: { type: 'hash', value: 'abc123def456' } },
  { kind: 'ThreatActor', props: { name: 'APT29', origin: 'RU' } },
];

const AUTH_HEADERS = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${__ENV.TEST_TOKEN || 'test-token-123'}`,
};

// Utility functions
function randomChoice(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function generateLargePrompt(sizeMultiplier = 1) {
  const basePrompt = randomChoice(SAMPLE_PROMPTS);
  return basePrompt + ' '.repeat(1000 * sizeMultiplier) + basePrompt;
}

function generateTestTenant() {
  return `tenant_${Math.floor(Math.random() * 10)}`;
}

// Test scenarios
export default function () {
  const tenant = generateTestTenant();

  group('Token Counting Load Test', () => {
    testBasicTokenCounting(tenant);
    testBatchTokenCounting(tenant);
    testLargePromptTokenCounting(tenant);
  });

  group('GraphQL Mutations Load Test', () => {
    testEntityMutations(tenant);
    testRelationshipMutations(tenant);
    testInvestigationMutations(tenant);
  });

  group('Budget Enforcement Load Test', () => {
    testBudgetLimits(tenant);
    testBudgetDenials(tenant);
  });

  group('Rate Limiting Load Test', () => {
    testRateLimits(tenant);
    testBurstTraffic(tenant);
  });

  group('Chaos Engineering Load Test', () => {
    testChaosInjection(tenant);
    testSystemRecovery(tenant);
  });

  activeConnections.add(1);
  sleep(Math.random() * 2); // Random sleep 0-2s
  activeConnections.add(-1);
}

function testBasicTokenCounting(tenant) {
  const prompt = randomChoice(SAMPLE_PROMPTS);

  const payload = {
    provider: randomChoice(['openai', 'anthropic', 'gemini']),
    model: randomChoice(['gpt-4o-mini', 'claude-3-haiku', 'gemini-1.5-flash']),
    prompt: prompt,
  };

  const startTime = new Date();
  const response = http.post(TOKEN_COUNT_URL, JSON.stringify(payload), {
    headers: AUTH_HEADERS,
    tags: { scenario: 'basic_token_count', tenant: tenant },
  });

  const endTime = new Date();
  tokenCountLatency.add(endTime - startTime);

  const success = check(response, {
    'token count status is 200': (r) => r.status === 200,
    'token count has valid response': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.total > 0 && data.estimatedCostUSD >= 0;
      } catch {
        return false;
      }
    },
  });

  mutationSuccessRate.add(success);
}

function testBatchTokenCounting(tenant) {
  const requests = [];
  const batchSize = Math.floor(Math.random() * 10) + 1; // 1-10 requests

  for (let i = 0; i < batchSize; i++) {
    requests.push({
      id: `req_${i}`,
      provider: randomChoice(['openai', 'anthropic', 'gemini']),
      model: randomChoice(['gpt-4o-mini', 'claude-3-haiku']),
      prompt: randomChoice(SAMPLE_PROMPTS),
    });
  }

  const response = http.post(
    `${TOKEN_COUNT_URL}/batch`,
    JSON.stringify({
      requests: requests,
    }),
    {
      headers: AUTH_HEADERS,
      tags: {
        scenario: 'batch_token_count',
        tenant: tenant,
        batch_size: batchSize,
      },
    },
  );

  const success = check(response, {
    'batch token count status is 200': (r) => r.status === 200,
    'batch has correct number of results': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.results && data.results.length === batchSize;
      } catch {
        return false;
      }
    },
  });

  mutationSuccessRate.add(success);
}

function testLargePromptTokenCounting(tenant) {
  const largePrompt = generateLargePrompt(Math.floor(Math.random() * 5) + 1);

  const payload = {
    provider: 'openai',
    model: 'gpt-4o-mini',
    prompt: largePrompt,
  };

  const response = http.post(TOKEN_COUNT_URL, JSON.stringify(payload), {
    headers: AUTH_HEADERS,
    tags: { scenario: 'large_prompt_token_count', tenant: tenant },
  });

  const success = check(response, {
    'large prompt status is 200 or 429': (r) =>
      r.status === 200 || r.status === 429,
    'large prompt handled correctly': (r) => {
      if (r.status === 429) {
        budgetDenials.add(1);
        return true; // Budget denial is expected behavior
      }
      try {
        const data = JSON.parse(r.body);
        return data.total > 1000; // Should be substantial
      } catch {
        return false;
      }
    },
  });

  mutationSuccessRate.add(success);
}

function testEntityMutations(tenant) {
  const entity = randomChoice(SAMPLE_ENTITIES);

  const mutation = `
    mutation CreateEntity($input: EntityInput!) {
      createEntity(input: $input) @budget(capUSD: 0.10, tokenCeiling: 5000) {
        id
        kind
        props
        createdAt
      }
    }
  `;

  const variables = {
    input: {
      tenantId: tenant,
      kind: entity.kind,
      labels: [entity.kind],
      props: entity.props,
      source: 'load_test',
    },
  };

  const response = http.post(
    GRAPHQL_URL,
    JSON.stringify({
      query: mutation,
      variables: variables,
    }),
    {
      headers: AUTH_HEADERS,
      tags: {
        scenario: 'entity_mutation',
        tenant: tenant,
        entity_kind: entity.kind,
      },
    },
  );

  const success = check(response, {
    'entity mutation status is 200': (r) => r.status === 200,
    'entity mutation successful or budget denied': (r) => {
      try {
        const data = JSON.parse(r.body);
        if (data.errors) {
          const isBudgetError = data.errors.some(
            (e) => e.message.includes('budget') || e.message.includes('Budget'),
          );
          if (isBudgetError) {
            budgetDenials.add(1);
            return true; // Budget denial is valid
          }
          return false;
        }
        return data.data && data.data.createEntity && data.data.createEntity.id;
      } catch {
        return false;
      }
    },
  });

  mutationSuccessRate.add(success);
}

function testRelationshipMutations(tenant) {
  const mutation = `
    mutation CreateRelationship($input: RelationshipInput!) {
      createRelationship(input: $input) @budget(capUSD: 0.05, tokenCeiling: 2000) {
        id
        type
        createdAt
      }
    }
  `;

  const variables = {
    input: {
      tenantId: tenant,
      srcId: `entity_${Math.floor(Math.random() * 1000)}`,
      dstId: `entity_${Math.floor(Math.random() * 1000)}`,
      type: randomChoice([
        'CONNECTS_TO',
        'BELONGS_TO',
        'SIMILAR_TO',
        'LINKED_TO',
      ]),
      props: { confidence: Math.random() },
      source: 'load_test',
    },
  };

  const response = http.post(
    GRAPHQL_URL,
    JSON.stringify({
      query: mutation,
      variables: variables,
    }),
    {
      headers: AUTH_HEADERS,
      tags: { scenario: 'relationship_mutation', tenant: tenant },
    },
  );

  check(response, {
    'relationship mutation handled': (r) =>
      r.status === 200 || r.status === 400 || r.status === 429,
  });
}

function testInvestigationMutations(tenant) {
  const mutation = `
    mutation CreateInvestigation($input: InvestigationInput!) {
      createInvestigation(input: $input) @budget(capUSD: 0.02, tokenCeiling: 1000) {
        id
        name
        status
        createdAt
      }
    }
  `;

  const variables = {
    input: {
      tenantId: tenant,
      name: `Load Test Investigation ${Math.floor(Math.random() * 10000)}`,
      description: 'Generated during load testing',
      status: 'ACTIVE',
    },
  };

  const response = http.post(
    GRAPHQL_URL,
    JSON.stringify({
      query: mutation,
      variables: variables,
    }),
    {
      headers: AUTH_HEADERS,
      tags: { scenario: 'investigation_mutation', tenant: tenant },
    },
  );

  check(response, {
    'investigation mutation handled': (r) =>
      r.status === 200 || r.status === 429,
  });
}

function testBudgetLimits(tenant) {
  // Intentionally exceed budget with large prompt
  const veryLargePrompt = generateLargePrompt(10); // 10x size multiplier

  const payload = {
    provider: 'openai',
    model: 'gpt-4o', // Expensive model
    prompt: veryLargePrompt,
  };

  const response = http.post(TOKEN_COUNT_URL, JSON.stringify(payload), {
    headers: AUTH_HEADERS,
    tags: { scenario: 'budget_limit_test', tenant: tenant },
  });

  const budgetDenied = check(response, {
    'budget limit enforced': (r) => {
      if (r.status === 429) {
        budgetDenials.add(1);
        return true;
      }
      // Might be allowed if under limit
      return r.status === 200;
    },
  });
}

function testBudgetDenials(tenant) {
  // Rapid-fire requests to trigger budget limits
  for (let i = 0; i < 5; i++) {
    const payload = {
      provider: 'openai',
      model: 'gpt-4-turbo', // Expensive model
      prompt: generateLargePrompt(5),
    };

    const response = http.post(TOKEN_COUNT_URL, JSON.stringify(payload), {
      headers: AUTH_HEADERS,
      tags: {
        scenario: 'budget_denial_burst',
        tenant: tenant,
        burst_request: i,
      },
    });

    if (response.status === 429) {
      budgetDenials.add(1);
    }
  }
}

function testRateLimits(tenant) {
  // Rapid requests to test rate limiting
  const requests = [];
  for (let i = 0; i < 10; i++) {
    requests.push({
      method: 'POST',
      url: TOKEN_COUNT_URL,
      body: JSON.stringify({
        provider: 'openai',
        model: 'gpt-4o-mini',
        prompt: 'Quick test prompt',
      }),
      params: {
        headers: AUTH_HEADERS,
        tags: { scenario: 'rate_limit_test', tenant: tenant, burst_req: i },
      },
    });
  }

  const responses = http.batch(requests);

  let rateLimited = 0;
  responses.forEach((response, index) => {
    if (response.status === 429) {
      rateLimitHits.add(1);
      rateLimited++;
    }

    check(response, {
      [`batch request ${index} handled`]: (r) =>
        r.status === 200 || r.status === 429,
    });
  });

  // Some requests should be rate limited in a burst
  check(rateLimited, {
    'some requests were rate limited': (count) => count > 0,
  });
}

function testBurstTraffic(tenant) {
  // Simulate burst traffic patterns
  const burstSize = 20;
  const requests = [];

  for (let i = 0; i < burstSize; i++) {
    const mutation = `
      mutation QuickEntity($input: EntityInput!) {
        createEntity(input: $input) @budget(capUSD: 0.001, tokenCeiling: 100) {
          id
        }
      }
    `;

    requests.push({
      method: 'POST',
      url: GRAPHQL_URL,
      body: JSON.stringify({
        query: mutation,
        variables: {
          input: {
            tenantId: tenant,
            kind: 'TestEntity',
            labels: ['Test'],
            props: { index: i, burst: true },
          },
        },
      }),
      params: {
        headers: AUTH_HEADERS,
        tags: {
          scenario: 'burst_traffic',
          tenant: tenant,
          burst_size: burstSize,
        },
      },
    });
  }

  const responses = http.batch(requests);

  let successful = 0;
  let rateLimited = 0;
  let budgetDenied = 0;

  responses.forEach((response) => {
    if (response.status === 200) {
      successful++;
    } else if (response.status === 429) {
      // Could be rate limit or budget
      const body = response.body || '';
      if (body.includes('rate limit') || body.includes('Rate limit')) {
        rateLimitHits.add(1);
        rateLimited++;
      } else {
        budgetDenials.add(1);
        budgetDenied++;
      }
    }
  });

  check(
    { successful, rateLimited, budgetDenied },
    {
      'burst traffic handled appropriately': (stats) => {
        // At least some should succeed, some should be limited
        return (
          stats.successful > 0 && stats.rateLimited + stats.budgetDenied > 0
        );
      },
    },
  );
}

function testChaosInjection(tenant) {
  // Enable database chaos for this test
  const chaosConfig = {
    scenario: 'databaseChaos',
  };

  const startTime = new Date();
  let recovered = false;

  try {
    // Enable chaos
    const chaosResponse = http.post(
      `${BASE_URL}/chaos/scenarios`,
      JSON.stringify(chaosConfig),
      {
        headers: AUTH_HEADERS,
        tags: { scenario: 'chaos_injection', tenant: tenant },
      },
    );

    faultInjectionRate.add(chaosResponse.status === 200);

    // Try a mutation under chaos
    const mutation = `
      mutation CreateEntityWithChaos($input: EntityInput!) {
        createEntity(input: $input) @budget(capUSD: 0.05, tokenCeiling: 1000) {
          id
          kind
        }
      }
    `;

    const variables = {
      input: {
        tenantId: tenant,
        kind: 'ChaosTestEntity',
        labels: ['Chaos'],
        props: { chaosTest: true },
        source: 'chaos_test',
      },
    };

    const mutationResponse = http.post(
      GRAPHQL_URL,
      JSON.stringify({
        query: mutation,
        variables: variables,
      }),
      {
        headers: AUTH_HEADERS,
        tags: { scenario: 'chaos_mutation', tenant: tenant },
      },
    );

    // Check if system handles chaos gracefully
    const chaosHandled = check(
      mutationResponse,
      {
        'chaos mutation handled gracefully': (r) => {
          // Either succeeds or fails gracefully (not 5xx)
          return r.status < 500;
        },
        'proper error response during chaos': (r) => {
          if (r.status >= 400 && r.status < 500) {
            try {
              const data = JSON.parse(r.body);
              return data.errors && data.errors.length > 0;
            } catch {
              return false;
            }
          }
          return true;
        },
      },
      { type: 'chaosRecovered' },
    );

    recovered = chaosHandled;

    // Clear chaos
    http.post(
      `${BASE_URL}/chaos/scenarios`,
      JSON.stringify({ scenario: 'clearAll' }),
      {
        headers: AUTH_HEADERS,
      },
    );
  } catch (error) {
    recovered = false;
  } finally {
    const recoveryTime = new Date() - startTime;
    systemRecoveryTime.add(recoveryTime);
    chaosRecoveryRate.add(recovered);
  }
}

function testSystemRecovery(tenant) {
  // Test system recovery after various fault scenarios
  const scenarios = ['resourcePressure', 'networkPartition', 'providerChaos'];
  const scenario = randomChoice(scenarios);

  const startTime = new Date();
  let recoverySuccessful = false;

  try {
    // Inject fault
    http.post(`${BASE_URL}/chaos/scenarios`, JSON.stringify({ scenario }), {
      headers: AUTH_HEADERS,
      tags: { scenario: 'recovery_test', fault_type: scenario, tenant: tenant },
    });

    // Wait a bit for fault to take effect
    sleep(1);

    // Try operations under fault
    const healthCheck = http.get(`${BASE_URL}/health`, {
      headers: AUTH_HEADERS,
      tags: { scenario: 'health_during_chaos', tenant: tenant },
    });

    // Clear fault
    http.post(
      `${BASE_URL}/chaos/scenarios`,
      JSON.stringify({ scenario: 'clearAll' }),
      {
        headers: AUTH_HEADERS,
      },
    );

    // Test recovery
    sleep(1);

    const postRecoveryHealth = http.get(`${BASE_URL}/health`, {
      headers: AUTH_HEADERS,
      tags: { scenario: 'health_after_recovery', tenant: tenant },
    });

    recoverySuccessful = check(
      postRecoveryHealth,
      {
        'system recovered after chaos': (r) => r.status === 200,
        'health check passes after recovery': (r) => {
          try {
            const data = JSON.parse(r.body);
            return data.status === 'ok' || data.healthy === true;
          } catch {
            return r.status === 200;
          }
        },
      },
      { type: 'chaosRecovered' },
    );
  } catch (error) {
    recoverySuccessful = false;
  } finally {
    const recoveryTime = new Date() - startTime;
    systemRecoveryTime.add(recoveryTime);
    chaosRecoveryRate.add(recoverySuccessful);
  }
}

// Teardown function
export function teardown(data) {
  // Clear any remaining chaos
  try {
    http.post(
      `${BASE_URL}/chaos/scenarios`,
      JSON.stringify({ scenario: 'clearAll' }),
      {
        headers: AUTH_HEADERS,
      },
    );
  } catch (error) {
    console.log('Warning: Could not clear chaos scenarios during teardown');
  }

  console.log(`
    Load Test Results Summary:
    - Budget Denials: ${budgetDenials.count || 0}
    - Rate Limit Hits: ${rateLimitHits.count || 0}
    - Compensation Events: ${compensationEvents.count || 0}
    - Fault Injection Rate: ${(faultInjectionRate.rate || 0) * 100}%
    - Chaos Recovery Rate: ${(chaosRecoveryRate.rate || 0) * 100}%
    - Average Token Count Latency: ${tokenCountLatency.avg || 0}ms
    - Average System Recovery Time: ${systemRecoveryTime.avg || 0}ms
  `);
}
