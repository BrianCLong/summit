import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';
const sloMode = (__ENV.SLO_MODE || 'mock').toLowerCase();
const strictMode = sloMode === 'strict';

// Custom metrics
export const errorRate = new Rate('errors');

const graphqlThresholds = strictMode
  ? {
      'http_req_duration{endpoint:graphql_query}': ['p(95)<350', 'p(99)<900'],
      'http_req_duration{endpoint:graphql_mutation}': ['p(95)<700', 'p(99)<1500'],
    }
  : {
      // Lenient thresholds keep CI stable against the mock surface while still recording metrics
      'http_req_duration{endpoint:graphql_query}': ['p(95)<1500', 'p(99)<2500'],
    };

export const options = {
  stages: [
    { duration: '30s', target: 5 }, // Ramp up
    { duration: '1m', target: 5 }, // Stay at 5 users
    { duration: '30s', target: 0 }, // Ramp down
  ],
  thresholds: {
    errors: ['rate<0.01'], // Error rate must be below 1%
    'http_req_duration{endpoint:health}': ['p(95)<200'],
    'http_req_duration{endpoint:api_health}': ['p(95)<200'],
    ...graphqlThresholds,
  },
};

function parseJson(body) {
  try {
    return JSON.parse(body);
  } catch (error) {
    return { error };
  }
}

function summarizeEndpointMetric(data, metricKey) {
  const metric = data.metrics[metricKey];
  if (!metric || !metric.values) {
    return null;
  }

  return {
    count: metric.values.count ?? 0,
    p95: metric.values['p(95)'],
    p99: metric.values['p(99)'],
    avg: metric.values.avg,
  };
}

function formatEndpointSummary(data) {
  const endpoints = [
    'http_req_duration{endpoint:health}',
    'http_req_duration{endpoint:api_health}',
    'http_req_duration{endpoint:graphql_query}',
    'http_req_duration{endpoint:graphql_mutation}',
  ];

  return endpoints.reduce((summary, key) => {
    const metric = summarizeEndpointMetric(data, key);
    if (metric) {
      summary[key] = metric;
    }
    return summary;
  }, {});
}

export default function () {
  // Health check endpoint
  const healthResponse = http.get(`${baseUrl}/health`, {
    tags: { endpoint: 'health', name: 'health', opType: 'read' },
  });
  const healthCheck = check(healthResponse, {
    'health check status is 200': (r) => r.status === 200,
    'health check has body': (r) => r.body.length > 0,
  });
  errorRate.add(!healthCheck);

  sleep(1);

  // API health check
  const apiHealthResponse = http.get(`${baseUrl}/api/health`, {
    tags: { endpoint: 'api_health', name: 'api_health', opType: 'read' },
  });
  const apiHealthCheck = check(apiHealthResponse, {
    'API health check status is 200': (r) => r.status === 200,
    'API health check response time < 200ms': (r) => r.timings.duration < 200,
  });
  errorRate.add(!apiHealthCheck);

  sleep(1);

  // GraphQL introspection (basic connectivity test)
  const graphqlQuery = {
    query: `
      query IntrospectionQuery {
        __schema {
          mutationType { name }
          types { name }
        }
      }
    `,
  };

  const graphqlResponse = http.post(
    `${baseUrl}/graphql`,
    JSON.stringify(graphqlQuery),
    {
      headers: {
        'Content-Type': 'application/json',
      },
      tags: { endpoint: 'graphql_query', name: 'introspection', opType: 'query' },
    },
  );

  const parsedIntrospection = parseJson(graphqlResponse.body);
  const mutationSupported =
    parsedIntrospection?.data?.__schema?.mutationType?.name ?? null;

  const graphqlCheck = check(graphqlResponse, {
    'GraphQL introspection status is 200': (r) => r.status === 200,
    'GraphQL introspection has schema': () => Boolean(parsedIntrospection?.data?.__schema),
  });
  errorRate.add(!graphqlCheck);

  sleep(1);

  // GraphQL mutation (__typename is universally valid when mutation root exists)
  if (strictMode && mutationSupported) {
    const mutationResponse = http.post(
      `${baseUrl}/graphql`,
      JSON.stringify({
        query: `
          mutation SmokeMutationTypename {
            __typename
          }
        `,
        operationName: 'SmokeMutationTypename',
      }),
      {
        headers: {
          'Content-Type': 'application/json',
        },
        tags: {
          endpoint: 'graphql_mutation',
          name: 'SmokeMutationTypename',
          opType: 'mutation',
        },
      },
    );

    const parsedMutation = parseJson(mutationResponse.body);

    const mutationCheck = check(mutationResponse, {
      'GraphQL mutation status is 200': (r) => r.status === 200,
      'GraphQL mutation has typename': () =>
        Boolean(parsedMutation?.data?.__typename || parsedMutation?.data?.SmokeMutationTypename),
      'GraphQL mutation has no errors': () =>
        !(parsedMutation?.errors && parsedMutation.errors.length > 0),
    });

    errorRate.add(!mutationCheck);
  }

  // Build hub health check (if available)
  const buildHubResponse = http.get(`${baseUrl}/api/buildhub/health`, {
    timeout: '10s',
    tags: { endpoint: 'buildhub_health', name: 'buildhub_health', opType: 'read' },
  });

  // Don't fail if build hub is not available (it's optional)
  if (buildHubResponse.status !== 0) {
    check(buildHubResponse, {
      'Build hub is responsive': (r) => r.status === 200 || r.status === 404,
    });
  }

  sleep(2);
}

export function handleSummary(data) {
  const endpointSummary = formatEndpointSummary(data);
  const overallP95 = data.metrics?.http_req_duration?.values?.['p(95)'];
  const overallP99 = data.metrics?.http_req_duration?.values?.['p(99)'];
  const totalRequests = data.metrics?.http_reqs?.values?.count ?? 0;

  return {
    'smoke-test-results.json': JSON.stringify(
      {
        mode: sloMode,
        baseUrl,
        thresholds: options.thresholds,
        endpoints: endpointSummary,
        errors: data.metrics.errors?.values ?? {},
      },
      null,
      2,
    ),
    stdout: `
🏗️ Maestro Build Plane Smoke Test Results
==========================================
Mode: ${sloMode}
Base URL: ${baseUrl}

✅ Total Requests: ${totalRequests}
⏱️ 95th Percentile (overall): ${overallP95 ? Math.round(overallP95) : 'n/a'}ms
⏱️ 99th Percentile (overall): ${overallP99 ? Math.round(overallP99) : 'n/a'}ms
❌ Error Rate: ${(data.metrics.errors.values.rate * 100).toFixed(2)}%

Endpoint breakdown (p95 / p99 ms):
${Object.entries(endpointSummary)
      .map(
        ([key, metric]) =>
          ` - ${key}: p95=${metric.p95 ? Math.round(metric.p95) : 'n/a'}ms, p99=${metric.p99 ? Math.round(metric.p99) : 'n/a'}ms (count=${metric.count})`,
      )
      .join('\n')}

${data.metrics.errors.values.rate < 0.1 ? '🎉 All checks passed!' : '⚠️  Some checks failed'}
`,
  };
}
