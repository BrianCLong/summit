import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';
const sloMode = (__ENV.SLO_MODE || 'mock').toLowerCase();
const strictMode = sloMode === 'strict';

export const errorRate = new Rate('errors');

const thresholds = {
  errors: ['rate<0.01'],
  'http_req_duration{endpoint:graphql_query}': strictMode
    ? ['p(95)<350', 'p(99)<900']
    : ['p(95)<1500', 'p(99)<2500'],
};

if (strictMode) {
  thresholds['http_req_duration{endpoint:graphql_mutation}'] = [
    'p(95)<700',
    'p(99)<1500',
  ];
}

export const options = {
  vus: strictMode ? 10 : 5,
  duration: strictMode ? '2m' : '1m',
  thresholds,
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

function runGraphQLIntrospection() {
  const response = http.post(
    `${baseUrl}/graphql`,
    JSON.stringify({
      query: `
        query SmokeIntrospection {
          __schema {
            mutationType { name }
            queryType { name }
          }
        }
      `,
      operationName: 'SmokeIntrospection',
    }),
    {
      headers: {
        'Content-Type': 'application/json',
      },
      tags: { endpoint: 'graphql_query', name: 'SmokeIntrospection', opType: 'query' },
    },
  );

  const parsed = parseJson(response.body);
  const mutationSupported =
    parsed?.data?.__schema?.mutationType?.name && !parsed.errors?.length;

  const isOk = check(response, {
    'Introspection status is 200': (r) => r.status === 200,
    'Introspection schema present': () => Boolean(parsed?.data?.__schema),
  });

  errorRate.add(!isOk);

  return { mutationSupported: Boolean(mutationSupported) };
}

function runGraphQLMutation() {
  const response = http.post(
    `${baseUrl}/graphql`,
    JSON.stringify({
      query: `
        mutation GraphqlSloTypename {
          __typename
        }
      `,
      operationName: 'GraphqlSloTypename',
    }),
    {
      headers: {
        'Content-Type': 'application/json',
      },
      tags: {
        endpoint: 'graphql_mutation',
        name: 'GraphqlSloTypename',
        opType: 'mutation',
      },
    },
  );

  const parsed = parseJson(response.body);
  const isOk = check(response, {
    'Mutation status is 200': (r) => r.status === 200,
    'Mutation returns typename': () =>
      Boolean(parsed?.data?.__typename || parsed?.data?.GraphqlSloTypename),
    'Mutation has no GraphQL errors': () =>
      !(parsed?.errors && parsed.errors.length > 0),
  });

  errorRate.add(!isOk);
}

export default function () {
  const { mutationSupported } = runGraphQLIntrospection();

  if (strictMode && mutationSupported) {
    runGraphQLMutation();
  }

  sleep(1);
}

export function handleSummary(data) {
  const endpointSummary = formatEndpointSummary(data);
  const mutationMetrics = endpointSummary['http_req_duration{endpoint:graphql_mutation}'];
  const mutationAttempted = Boolean(mutationMetrics && mutationMetrics.count > 0);

  return {
    'graphql-slo-results.json': JSON.stringify(
      {
        mode: sloMode,
        baseUrl,
        thresholds: options.thresholds,
        endpoints: endpointSummary,
        errors: data.metrics.errors?.values ?? {},
        mutationAttempted,
      },
      null,
      2,
    ),
    stdout: `
🎯 GraphQL SLO Results
======================
Mode: ${sloMode}
Base URL: ${baseUrl}

GraphQL Query p95/p99: ${
      endpointSummary['http_req_duration{endpoint:graphql_query}']
        ? `${Math.round(endpointSummary['http_req_duration{endpoint:graphql_query}'].p95)}ms / ${Math.round(endpointSummary['http_req_duration{endpoint:graphql_query}'].p99)}ms`
        : 'n/a'
    }
GraphQL Mutation p95/p99: ${
      mutationMetrics
        ? `${Math.round(mutationMetrics.p95)}ms / ${Math.round(mutationMetrics.p99)}ms`
        : 'skipped'
    }
❌ Error Rate: ${(data.metrics.errors.values.rate * 100).toFixed(2)}%

${data.metrics.errors.values.rate < 0.1 ? '🎉 All checks passed!' : '⚠️  Some checks failed'}
`,
  };
}
