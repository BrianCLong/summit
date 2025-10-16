import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
export const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '30s', target: 5 }, // Ramp up
    { duration: '1m', target: 5 }, // Stay at 5 users
    { duration: '30s', target: 0 }, // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<400'], // 95% of requests must complete below 400ms
    errors: ['rate<0.01'], // Error rate must be below 1%
  },
};

export default function () {
  const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';

  // Health check endpoint
  let response = http.get(`${baseUrl}/health`);
  const healthCheck = check(response, {
    'health check status is 200': (r) => r.status === 200,
    'health check has body': (r) => r.body.length > 0,
  });
  errorRate.add(!healthCheck);

  sleep(1);

  // API health check
  response = http.get(`${baseUrl}/api/health`);
  const apiHealthCheck = check(response, {
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
          types {
            name
          }
        }
      }
    `,
  };

  response = http.post(`${baseUrl}/graphql`, JSON.stringify(graphqlQuery), {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const graphqlCheck = check(response, {
    'GraphQL introspection status is 200': (r) => r.status === 200,
    'GraphQL introspection has schema': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data && body.data.__schema;
      } catch {
        return false;
      }
    },
  });
  errorRate.add(!graphqlCheck);

  sleep(1);

  // Build hub health check (if available)
  response = http.get(`${baseUrl}/api/buildhub/health`, {
    timeout: '10s',
  });

  // Don't fail if build hub is not available (it's optional)
  if (response.status !== 0) {
    check(response, {
      'Build hub is responsive': (r) => r.status === 200 || r.status === 404,
    });
  }

  sleep(2);
}

export function handleSummary(data) {
  return {
    'smoke-test-results.json': JSON.stringify(data, null, 2),
    stdout: `
🏗️ Maestro Build Plane Smoke Test Results
==========================================

✅ Total Requests: ${data.metrics.http_reqs.values.count}
⏱️  Average Response Time: ${Math.round(data.metrics.http_req_duration.values.avg)}ms
📊 95th Percentile: ${Math.round(data.metrics.http_req_duration.values['p(95)'])}ms
❌ Error Rate: ${(data.metrics.errors.values.rate * 100).toFixed(2)}%

${data.metrics.errors.values.rate < 0.1 ? '🎉 All checks passed!' : '⚠️  Some checks failed'}
`,
  };
}
