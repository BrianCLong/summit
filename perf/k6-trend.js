/**
 * k6 SLO Trend Monitoring
 *
 * Advanced performance testing with Prometheus metrics integration
 * Tracks p95, error rates, and throughput trends over time
 */

import { Trend, Rate, Counter, Gauge } from 'k6/metrics';
import http from 'k6/http';
import { check, sleep } from 'k6';
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Custom metrics for trend analysis
export let apiLatencyP95 = new Trend('api_latency_p95', true);
export let apiLatencyP99 = new Trend('api_latency_p99', true);
export let apiErrorRate = new Rate('api_error_rate');
export let apiThroughput = new Counter('api_requests_total');
export let activeUsers = new Gauge('api_active_users');

// Health check specific metrics
export let healthCheckLatency = new Trend('health_check_latency');
export let graphqlLatency = new Trend('graphql_latency');
export let dbConnectionTime = new Trend('db_connection_time');

// Business logic metrics
export let entityRetrievalTime = new Trend('entity_retrieval_time');
export let searchLatency = new Trend('search_latency');
export let authenticationTime = new Trend('authentication_time');

// Configuration with environment overrides
const config = {
  target: __ENV.TARGET || __ENV.BASE_URL || 'http://localhost:4000',
  apiKey: __ENV.API_KEY || '',
  prometheus: {
    enabled: __ENV.PROMETHEUS_ENABLED === 'true',
    endpoint:
      __ENV.PROMETHEUS_GATEWAY ||
      'http://localhost:9091/metrics/job/k6-slo-trends',
  },
  scenarios: {
    baseline: { vus: 10, duration: '2m' },
    stress: { vus: 50, duration: '3m' },
    spike: { vus: 100, duration: '1m' },
  },
};

// Load test configuration
export const options = {
  scenarios: {
    // Baseline load pattern
    baseline_load: {
      executor: 'constant-vus',
      vus: parseInt(__ENV.BASELINE_VUS) || 10,
      duration: __ENV.BASELINE_DURATION || '5m',
      tags: { scenario: 'baseline' },
    },

    // Gradual ramp-up pattern
    ramp_up: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '2m', target: 20 },
        { duration: '5m', target: 50 },
        { duration: '2m', target: 0 },
      ],
      tags: { scenario: 'ramp' },
    },

    // Spike testing pattern
    spike_test: {
      executor: 'constant-vus',
      vus: parseInt(__ENV.SPIKE_VUS) || 100,
      duration: __ENV.SPIKE_DURATION || '30s',
      startTime: '8m',
      tags: { scenario: 'spike' },
    },
  },

  // SLO thresholds
  thresholds: {
    // Primary SLO targets
    api_latency_p95: ['p(95)<200'],
    api_error_rate: ['rate<0.01'],
    'http_req_duration{scenario:baseline}': ['p(95)<150'],

    // Health check SLOs
    health_check_latency: ['p(95)<50'],

    // GraphQL specific SLOs
    graphql_latency: ['p(95)<300'],

    // Business logic SLOs
    entity_retrieval_time: ['p(95)<500'],
    search_latency: ['p(95)<1000'],

    // Availability SLOs
    checks: ['rate>0.99'],
  },

  // Output configuration
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],

  // External output (for CI/CD integration)
  ext: {
    prometheus: config.prometheus.enabled
      ? {
          addr: config.prometheus.endpoint,
        }
      : undefined,
  },
};

console.log(`🎯 SLO Trend Monitoring targeting: ${config.target}`);
console.log(
  `📊 Prometheus integration: ${config.prometheus.enabled ? 'enabled' : 'disabled'}`,
);

// Request headers configuration
function getHeaders() {
  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': 'k6-slo-trends/1.0',
    'X-K6-Test': 'true',
  };

  if (config.apiKey) {
    headers['Authorization'] = `Bearer ${config.apiKey}`;
  }

  return headers;
}

// Test scenarios
export default function () {
  const headers = getHeaders();
  const scenario = __ENV.EXEC_SCENARIO || 'default';

  // Update active users gauge
  activeUsers.add(1);

  // 1. Health check endpoint
  const healthStart = Date.now();
  let response = http.get(`${config.target}/health`, {
    headers,
    tags: { endpoint: 'health', scenario },
  });

  const healthDuration = Date.now() - healthStart;
  healthCheckLatency.add(healthDuration);
  apiThroughput.add(1);

  const healthOk = check(response, {
    '✅ Health endpoint responds': (r) => r.status === 200,
    '⚡ Health response time <100ms': (r) => r.timings.duration < 100,
  });

  if (!healthOk) {
    apiErrorRate.add(1);
  }

  // 2. Ready check with detailed validation
  response = http.get(`${config.target}/health/ready`, {
    headers,
    tags: { endpoint: 'ready', scenario },
  });

  const readyOk = check(response, {
    '✅ Ready endpoint responds': (r) => r.status === 200,
    '📊 Ready has valid JSON': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data && typeof data === 'object';
      } catch {
        return false;
      }
    },
    '⚡ Ready response time <200ms': (r) => r.timings.duration < 200,
  });

  if (!readyOk) {
    apiErrorRate.add(1);
  }

  // Track database connection time if available in response
  try {
    const readyData = JSON.parse(response.body);
    if (readyData.database && readyData.database.connectionTime) {
      dbConnectionTime.add(readyData.database.connectionTime);
    }
  } catch (e) {
    // Ignore parsing errors
  }

  apiThroughput.add(1);

  // 3. GraphQL introspection query
  const graphqlStart = Date.now();
  const graphqlQuery = {
    query: `
      query SLOProbe {
        __schema {
          queryType {
            name
            fields {
              name
              type {
                name
              }
            }
          }
        }
      }
    `,
  };

  response = http.post(
    `${config.target}/graphql`,
    JSON.stringify(graphqlQuery),
    {
      headers: { ...headers, 'Content-Type': 'application/json' },
      tags: { endpoint: 'graphql', scenario, operation: 'introspection' },
    },
  );

  const graphqlDuration = Date.now() - graphqlStart;
  graphqlLatency.add(graphqlDuration);
  apiThroughput.add(1);

  const graphqlOk = check(response, {
    '✅ GraphQL endpoint responds': (r) => r.status === 200,
    '🔍 GraphQL returns valid schema': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.data && data.data.__schema;
      } catch {
        return false;
      }
    },
    '⚡ GraphQL response time <500ms': (r) => r.timings.duration < 500,
  });

  if (!graphqlOk) {
    apiErrorRate.add(1);
  }

  // 4. Simulated entity retrieval
  if (scenario !== 'spike') {
    const entityStart = Date.now();
    const entityId = randomIntBetween(1, 1000);

    response = http.get(`${config.target}/api/v1/entities/${entityId}`, {
      headers,
      tags: { endpoint: 'entity', scenario, operation: 'get' },
    });

    const entityDuration = Date.now() - entityStart;
    entityRetrievalTime.add(entityDuration);
    apiThroughput.add(1);

    // Accept 404s as valid for non-existent entities
    const entityOk = check(response, {
      '✅ Entity endpoint accessible': (r) =>
        r.status === 200 || r.status === 404,
      '⚡ Entity response time <500ms': (r) => r.timings.duration < 500,
    });

    if (!entityOk && response.status !== 404) {
      apiErrorRate.add(1);
    }
  }

  // 5. Simulated search operation
  if (Math.random() < 0.3) {
    // 30% of requests include search
    const searchStart = Date.now();
    const searchQuery = {
      query: 'test entity',
      limit: 10,
    };

    response = http.post(
      `${config.target}/api/v1/search`,
      JSON.stringify(searchQuery),
      {
        headers,
        tags: { endpoint: 'search', scenario, operation: 'query' },
      },
    );

    const searchDuration = Date.now() - searchStart;
    searchLatency.add(searchDuration);
    apiThroughput.add(1);

    const searchOk = check(response, {
      '✅ Search endpoint responds': (r) =>
        r.status === 200 || r.status === 400,
      '⚡ Search response time <1000ms': (r) => r.timings.duration < 1000,
    });

    if (!searchOk) {
      apiErrorRate.add(1);
    }
  }

  // Calculate and record trend metrics
  apiLatencyP95.add(response.timings.duration);

  // Simulate realistic user behavior patterns
  const thinkTime = scenario === 'spike' ? 0.1 : randomIntBetween(1, 3);
  sleep(thinkTime);

  // Update active users gauge (decrement)
  activeUsers.add(-1);
}

// Setup function - runs once at the start
export function setup() {
  console.log('🚀 Starting SLO trend monitoring...');
  console.log(`📊 Target: ${config.target}`);
  console.log('🎯 SLO Targets:');
  console.log('   • p95 latency: <200ms (critical), <150ms (baseline)');
  console.log('   • Error rate: <1%');
  console.log('   • Availability: >99%');
  console.log('   • Health check: <50ms p95');
  console.log('   • GraphQL: <300ms p95');
  console.log('   • Entity retrieval: <500ms p95');
  console.log('   • Search: <1000ms p95');

  return {
    startTime: new Date(),
    config: config,
  };
}

// Teardown function - runs once at the end
export function teardown(data) {
  const duration = (new Date() - data.startTime) / 1000;
  console.log(`✅ SLO trend monitoring completed in ${duration.toFixed(1)}s`);
  console.log(
    '📈 Check output above for detailed SLO compliance and trend data',
  );

  if (config.prometheus.enabled) {
    console.log(
      `📊 Metrics exported to Prometheus: ${config.prometheus.endpoint}`,
    );
  }
}

// Custom summary handler for trend analysis
export function handleSummary(data) {
  const summary = {
    stdout: textSummary(data, { indent: '  ', enableColors: true }),
  };

  // Generate JSON summary for CI/CD integration
  if (__ENV.OUTPUT_JSON || __ENV.CI) {
    summary['slo-trends.json'] = JSON.stringify({
      timestamp: new Date().toISOString(),
      target: config.target,
      scenario: __ENV.EXEC_SCENARIO || 'default',
      slos: {
        p95_latency: data.metrics.api_latency_p95?.values?.['p(95)'] || 0,
        p99_latency: data.metrics.api_latency_p99?.values?.['p(99)'] || 0,
        error_rate: data.metrics.api_error_rate?.values?.rate || 0,
        throughput: data.metrics.api_requests_total?.values?.count || 0,
        availability: data.metrics.checks?.values?.rate || 0,
      },
      endpoints: {
        health_p95: data.metrics.health_check_latency?.values?.['p(95)'] || 0,
        graphql_p95: data.metrics.graphql_latency?.values?.['p(95)'] || 0,
        entity_p95: data.metrics.entity_retrieval_time?.values?.['p(95)'] || 0,
        search_p95: data.metrics.search_latency?.values?.['p(95)'] || 0,
      },
      thresholds_passed: Object.keys(data.thresholds || {}).filter(
        (key) => data.thresholds[key].ok,
      ).length,
      total_thresholds: Object.keys(data.thresholds || {}).length,
      passed: Object.values(data.thresholds || {}).every(
        (threshold) => threshold.ok,
      ),
    });
  }

  // Generate Prometheus format for direct ingestion
  if (__ENV.OUTPUT_PROMETHEUS) {
    const prometheusMetrics = generatePrometheusMetrics(data);
    summary['prometheus-metrics.txt'] = prometheusMetrics;
  }

  return summary;
}

// Generate Prometheus metrics format
function generatePrometheusMetrics(data) {
  const timestamp = Date.now();
  const labels = `target="${config.target}",scenario="${__ENV.EXEC_SCENARIO || 'default'}"`;

  let metrics = [];

  // Add main SLO metrics
  if (data.metrics.api_latency_p95?.values?.['p(95)']) {
    metrics.push(
      `k6_slo_latency_p95{${labels}} ${data.metrics.api_latency_p95.values['p(95)']} ${timestamp}`,
    );
  }

  if (data.metrics.api_error_rate?.values?.rate !== undefined) {
    metrics.push(
      `k6_slo_error_rate{${labels}} ${data.metrics.api_error_rate.values.rate} ${timestamp}`,
    );
  }

  if (data.metrics.api_requests_total?.values?.count) {
    metrics.push(
      `k6_slo_requests_total{${labels}} ${data.metrics.api_requests_total.values.count} ${timestamp}`,
    );
  }

  return metrics.join('\n') + '\n';
}

// Enhanced text summary
function textSummary(data, options = {}) {
  const indent = options.indent || '';
  const colors = options.enableColors || false;

  const slos = {
    p95: data.metrics.api_latency_p95?.values?.['p(95)'] || 0,
    p99: data.metrics.api_latency_p99?.values?.['p(99)'] || 0,
    errorRate: data.metrics.api_error_rate?.values?.rate || 0,
    throughput: data.metrics.api_requests_total?.values?.count || 0,
    availability: data.metrics.checks?.values?.rate || 0,
  };

  const sloStatus = {
    p95: slos.p95 < 200 ? '✅' : '❌',
    errorRate: slos.errorRate < 0.01 ? '✅' : '❌',
    availability: slos.availability > 0.99 ? '✅' : '❌',
  };

  return `
${indent}📊 SLO Trend Analysis Results
${indent}=============================
${indent}🎯 Target: ${config.target}
${indent}📅 Timestamp: ${new Date().toISOString()}
${indent}
${indent}🎯 PRIMARY SLOs:
${indent}⏱️  p95 Latency: ${slos.p95.toFixed(1)}ms (target: <200ms) ${sloStatus.p95}
${indent}⏱️  p99 Latency: ${slos.p99.toFixed(1)}ms (target: <500ms) ${slos.p99 < 500 ? '✅' : '❌'}
${indent}💥 Error Rate: ${(slos.errorRate * 100).toFixed(2)}% (target: <1%) ${sloStatus.errorRate}
${indent}✅ Availability: ${(slos.availability * 100).toFixed(2)}% (target: >99%) ${sloStatus.availability}
${indent}🚀 Throughput: ${slos.throughput} requests
${indent}
${indent}📈 ENDPOINT BREAKDOWN:
${indent}🏥 Health Check: ${data.metrics.health_check_latency?.values?.['p(95)']?.toFixed(1) || 'N/A'}ms p95
${indent}🔍 GraphQL: ${data.metrics.graphql_latency?.values?.['p(95)']?.toFixed(1) || 'N/A'}ms p95
${indent}📦 Entity Retrieval: ${data.metrics.entity_retrieval_time?.values?.['p(95)']?.toFixed(1) || 'N/A'}ms p95
${indent}🔍 Search: ${data.metrics.search_latency?.values?.['p(95)']?.toFixed(1) || 'N/A'}ms p95
${indent}
${indent}Overall SLO Status: ${Object.values(sloStatus).every((s) => s === '✅') ? '🎉 PASSED' : '🚨 FAILED'}
${indent}Test Duration: ${data.state.testRunDurationMs / 1000}s
${indent}
`;
}
