import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

export let errorRate = new Rate('errors');

export let options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '1m', target: 50 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<350'], // SLO: 350ms
    errors: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:4000/graphql';

// Complex query simulating an investigation graph expansion
const GRAPH_QUERY = `
  query GetInvestigationGraph($id: ID!) {
    investigation(id: $id) {
      id
      name
      entities {
        id
        type
        props
      }
      relationships {
        id
        from
        to
        type
      }
    }
  }
`;

export default function () {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${__ENV.AUTH_TOKEN || 'mock-token'}`
  };

  // Assuming investigation ID "123" exists or is seeded
  const payload = JSON.stringify({
    query: GRAPH_QUERY,
    variables: { id: "123" }
  });

  const res = http.post(BASE_URL, payload, { headers: headers });

  const success = check(res, {
    'status is 200': (r) => r.status === 200,
    'no graphql errors': (r) => !r.body.includes('errors'),
  });

  if (!success) {
    errorRate.add(1);
  }

  sleep(1);
}
