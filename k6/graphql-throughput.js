import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

export const errorRate = new Rate('errors');

export const options = {
  scenarios: {
    postgres_throughput: {
      executor: 'constant-arrival-rate',
      rate: 50,
      timeUnit: '1s',
      duration: '30s',
      preAllocatedVUs: 10,
      maxVUs: 50,
      exec: 'postgresQuery',
    },
    neo4j_throughput: {
      executor: 'constant-arrival-rate',
      rate: 50,
      timeUnit: '1s',
      duration: '30s',
      preAllocatedVUs: 10,
      maxVUs: 50,
      startTime: '35s', // Run sequentially
      exec: 'neo4jQuery',
    },
  },
  thresholds: {
    'errors': ['rate<0.01'], // <1% errors
    'http_req_duration': ['p(95)<500'], // 95% of requests must complete below 500ms
  },
};

const QUERY_PG = `
  query GetUsers {
    users {
      id
      email
    }
  }
`;

const QUERY_NEO4J = `
  query GetGraph {
    entities(first: 10) {
      id
      name
      type
    }
  }
`;

const API_URL = __ENV.API_URL || 'http://localhost:4000/graphql';

export function postgresQuery() {
  const payload = JSON.stringify({
    query: QUERY_PG,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const res = http.post(API_URL, payload, params);
  const success = check(res, {
    'status is 200': (r) => r.status === 200,
    'no graphql errors': (r) => r.body && !r.body.includes('errors'),
  });

  if (!success) {
    errorRate.add(1);
  }
}

export function neo4jQuery() {
  const payload = JSON.stringify({
    query: QUERY_NEO4J,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const res = http.post(API_URL, payload, params);
  const success = check(res, {
    'status is 200': (r) => r.status === 200,
    'no graphql errors': (r) => r.body && !r.body.includes('errors'),
  });

  if (!success) {
    errorRate.add(1);
  }
}
