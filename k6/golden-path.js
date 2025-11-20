import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

export let errorRate = new Rate('errors');

export let options = {
  stages: [
    { duration: '30s', target: 5 },
    { duration: '1m', target: 10 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    errors: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:4000/graphql';

export default function () {
  const headers = {
    'Content-Type': 'application/json',
    // 'Authorization': 'Bearer ...' // Dev mode auto-injects user if missing
  };

  // 1. Load Investigations
  const investigationsQuery = `
    query GetInvestigations {
      investigations(limit: 10) {
        id
        name
        createdAt
      }
    }
  `;

  let res = http.post(
    BASE_URL,
    JSON.stringify({ query: investigationsQuery }),
    { headers: headers }
  );

  check(res, {
    'investigations status 200': (r) => r.status === 200,
    'investigations has data': (r) => r.body && r.body.includes('investigations'),
  }) || errorRate.add(1);

  sleep(0.5);

  // 2. Search Entities (The Hot Path)
  // Using a common term likely to trigger the scan
  const entitiesQuery = `
    query SearchEntities {
      entities(q: "test", limit: 20) {
        id
        type
        props
      }
    }
  `;

  res = http.post(
    BASE_URL,
    JSON.stringify({ query: entitiesQuery }),
    { headers: headers }
  );

  check(res, {
    'entities status 200': (r) => r.status === 200,
    'entities success': (r) => r.body && !r.body.includes('errors'),
  }) || errorRate.add(1);

  sleep(0.5);

  // 3. Fetch Relationships
  const relationshipsQuery = `
    query GetRelationships {
      relationships(limit: 20) {
        id
        type
        from
        to
      }
    }
  `;

  res = http.post(
    BASE_URL,
    JSON.stringify({ query: relationshipsQuery }),
    { headers: headers }
  );

  check(res, {
    'relationships status 200': (r) => r.status === 200,
    'relationships success': (r) => r.body && !r.body.includes('errors'),
  }) || errorRate.add(1);

  sleep(1);
}
