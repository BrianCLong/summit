import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 20,
  duration: '2m',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<700', 'p(99)<1500'],
  },
};

const ENDPOINT = `${__ENV.GRAPHQL_URL || 'http://localhost:8080'}/graphql`;

const GET_DASHBOARD = `query GetUserDashboard($id: ID!) {
  user(id: $id) { id name widgets { id type } alerts { level message } }
}`;

const CREATE_NOTE = `mutation CreateNote($input: NoteInput!) { createNote(input: $input) { id text } }`;

export default function () {
  const headers = { 'Content-Type': 'application/json' };

  const q = http.post(
    ENDPOINT,
    JSON.stringify({ query: GET_DASHBOARD, variables: { id: 'seed-user-1' } }),
    { headers },
  );
  check(q, {
    'dashboard OK': (r) =>
      r.status === 200 && r.json('data.user.id') !== undefined,
  });

  const m = http.post(
    ENDPOINT,
    JSON.stringify({
      query: CREATE_NOTE,
      variables: { input: { text: `canary-${__VU}-${Date.now()}` } },
    }),
    { headers },
  );
  check(m, {
    'createNote OK': (r) =>
      r.status === 200 && r.json('data.createNote.id') !== undefined,
  });

  sleep(1);
}
