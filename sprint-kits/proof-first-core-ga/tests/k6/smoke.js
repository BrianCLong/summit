import http from 'k6/http';
import { sleep, check } from 'k6';

export const options = { vus: 20, duration: '3m' };

export default function () {
  const r = http.post('http://localhost:4000/graphql', JSON.stringify({
    query: 'mutation($c:String!,$id:String!){ runSandbox(cypher:$c, caseId:$id){ latencyMs } }',
    variables: { c: 'MATCH (n)-[r*1..3]->(m) RETURN n LIMIT 100', id: 'demo' }
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
  check(r, { '200': (res) => res.status === 200 });
  sleep(1);
}
