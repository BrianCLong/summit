import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '10s', target: 20 },
    { duration: '10s', target: 20 },
    { duration: '5s', target: 0 },
  ],
  thresholds: {
    'http_req_duration{name:Query}': ['p(95)<350'],
    'http_req_duration{name:Mutation}': ['p(95)<700'],
  },
};

const GRAPHQL_ENDPOINT = 'http://localhost:8080/graphql';

export default function () {
  const query = `
    query GetRun {
      run(id: "123") {
        id
        status
      }
    }
  `;

  const mutation = `
    mutation StartRun {
      startRun(input: {
        tenantId: "tenant-a",
        actor: "admin",
        task: "do something",
      }) {
        id
        status
      }
    }
  `;

  const headers = {
    'Content-Type': 'application/json',
  };

  const resQuery = http.post(GRAPHQL_ENDPOINT, JSON.stringify({ query }), { headers, tags: { name: 'Query' } });
  check(resQuery, {
    'GraphQL query status is 200': (r) => r.status === 200,
  });

  const resMutation = http.post(GRAPHQL_ENDPOINT, JSON.stringify({ query: mutation }), { headers, tags: { name: 'Mutation' } });
  check(resMutation, {
    'GraphQL mutation status is 200': (r) => r.status === 200,
  });

  sleep(1);
}
