import http from 'k6/http';
import { check, sleep } from 'k6';
import { uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

export let options = {
  stages: [
    { duration: '1m', target: 20 }, // ramp-up to 20 users
    { duration: '3m', target: 20 }, // stay at 20 users
    { duration: '30s', target: 0 }, // ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests below 500ms
  },
};

export default function () {
  const url = 'http://localhost:4000/graphql';
  const headers = { 'Content-Type': 'application/json' };

  // Read operation (70% of requests)
  if (Math.random() < 0.7) {
    const query = `
      query {
        entities(limit: 10) {
          id
          type
        }
      }
    `;
    const res = http.post(url, JSON.stringify({ query: query }), {
      headers: headers,
    });
    check(res, { 'read status 200': (r) => r.status === 200 });
  } else {
    // Write operation (30% of requests)
    const mutation = `
      mutation CreateEntity($input: EntityInput!) {
        createEntity(input: $input) {
          id
          type
        }
      }
    `;
    const entityType = `TestType_${Math.floor(Math.random() * 10)}`;
    const entityId = uuidv4();
    const variables = {
      input: {
        type: entityType,
        props: { name: `Test Entity ${entityId}`, value: Math.random() },
      },
    };
    const res = http.post(
      url,
      JSON.stringify({ query: mutation, variables: variables }),
      { headers: headers },
    );
    check(res, { 'write status 200': (r) => r.status === 200 });
  }

  sleep(1);
}
