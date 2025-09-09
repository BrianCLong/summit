import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = { 
  vus: 5, 
  duration: '2m',
  thresholds: {
    http_req_failed: ['rate<0.02'], // Error rate should be less than 2%
    http_req_duration: ['p(95)<1500'], // 95% of requests should be below 1.5s
  }
};

export default function () {
  const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';
  
  // Health check
  const healthRes = http.get(`${baseUrl}/healthz`);
  check(healthRes, { 
    'health check is 200': (r) => r.status === 200,
    'health check responds quickly': (r) => r.timings.duration < 200,
  });
  
  // Main API endpoint
  const apiRes = http.get(`${baseUrl}/api/v1/graph/nodes`);
  check(apiRes, { 
    'API responds 200': (r) => r.status === 200,
    'API response time OK': (r) => r.timings.duration < 1000,
  });
  
  // GraphQL endpoint
  const graphqlRes = http.post(`${baseUrl}/graphql`, JSON.stringify({
    query: '{ __schema { types { name } } }'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
  check(graphqlRes, { 
    'GraphQL introspection works': (r) => r.status === 200,
    'GraphQL schema returned': (r) => r.json() && r.json().data,
  });
  
  sleep(1);
}