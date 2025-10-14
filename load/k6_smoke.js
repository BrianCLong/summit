import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = { vus: 1, iterations: 5 };

export default function () {
  // GraphQL health smoke
  const gql = http.post('http://localhost:4000/graphql', JSON.stringify({ query: '{ __typename }' }), { headers: { 'content-type': 'application/json' } });
  check(gql, { 'gql status 200': (r) => r.status === 200 });

  // Ingest list connectors
  const con = http.get('http://localhost:4000/ingest/connectors');
  check(con, { 'connectors 200': (r) => r.status === 200 });

  sleep(0.5);
}

