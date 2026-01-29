import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '1m', target: 20 },
    { duration: '10s', target: 0 },
  ],
};

export default function () {
  const payload = JSON.stringify({
    query: `
      query ExplainAnomaly($id: ID!) {
        explainAnomaly(id: $id) {
          id
          score
          explanation
          features {
            name
            contribution
          }
        }
      }
    `,
    variables: {
      id: 'anomaly-123',
    },
  });

  const headers = { 'Content-Type': 'application/json' };
  const res = http.post('http://localhost:4000/graphql', payload, { headers });

  check(res, {
    'status is 200': (r) => r.status === 200,
    'no errors': (r) => !r.body.includes('errors'),
  });

  sleep(1);
}
