import { check, sleep } from 'k6';
import { gql } from './lib/graphql.js';

export const options = {
  scenarios: {
    reads: { executor: 'ramping-arrival-rate', startRate: 50, timeUnit: '1s', preAllocatedVUs: 200,
      stages: [ { duration: '10m', target: 300 }, { duration: '100m', target: 300 } ], tags: { kind: 'read' } },
    writes: { executor: 'constant-arrival-rate', rate: 60, timeUnit: '1s', duration: '120m', preAllocatedVUs: 300, tags: { kind: 'write' } },
  },
  thresholds: {
    'http_req_failed{kind:read}': ['rate<0.001'],
    'http_req_duration{kind:read}': ['p(95)<350'],
    'http_req_failed{kind:write}': ['rate<0.001'],
    'http_req_duration{kind:write}': ['p(95)<700'],
  },
};

const Q_READ = 'query($id:ID!){ node(id:$id){ id name __typename }}';
const Q_WRITE = 'mutation($n:String!){ addTag(name:$n){ id name }}';

export default function () {
  const url = __ENV.API_URL;
  const headers = { 'x-apq-hash': __ENV.APQ_HASH, 'x-tenant-id': __ENV.TENANT_ID };

  // Read path
  let r1 = gql(url, Q_READ, { id: '123' }, headers);
  check(r1, { 'read 200': (r) => r.status === 200 });

  // Write path (sampled)
  if (__ITER % 5 === 0) {
    let r2 = gql(url, Q_WRITE, { n: `k6-${__VU}-${__ITER}` }, headers);
    check(r2, { 'write 200': (r) => r.status === 200 });
  }

  sleep(0.5);
}

