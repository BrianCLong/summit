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
const MOCK_JWT = 'eyJhbGciOiJSUzI1NiJ9.eyJ0ZW5hbnRJZCI6InRlbmFudC1hIiwiYWN0b3IiOiJhZG1pbiIsImlhdCI6MTc2MjEyODc2NywiaXNzIjoidXJuOmV4YW1wbGU6aXNzdWVyIiwiYXVkIjoidXJuOmV4YW1wbGU6YXVkaWVuY2UiLCJleHAiOjE3NjIxMzU5Njd9.QlIjf2ZGPH_IsHLHJOReD4J1aRznaKAJ4ApwggSrsZpMkfNttbZ-i9z5FEcvbS97RC5P_Tx-j0WQ3jz0NxZMceoaQjcxMWNCVabi6--dCfnl6PyD3lWaep-S5Ce7wtOh1WS1jnWiM9QEdasWc5c6J-rRRBV5YL62TdnJuRwptPeVp-ouzmbLUGPuqkJpziffeC8o56YtAu_zdSQa_KgUm3hNDwPpsAqYy4HJ5v2nJtZZ40Yy82LTjOqFMIY3x1ikY_lY8t68wTTegRHJ4fMk3kOXgm0kyxEAlxw_Rf43RFD4xmDMkAXKn79E-vWDRPQKV4vUwlw_ykFugGTMqVxZ2Q';

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
        task: "do something",
      }) {
        id
        status
      }
    }
  `;

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${MOCK_JWT}`,
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
