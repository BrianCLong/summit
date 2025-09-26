import http from 'k6/http';
import encoding from 'k6/encoding';
import { check, sleep } from 'k6';

const credentials = `${__ENV.NEO4J_USER || 'neo4j'}:${__ENV.NEO4J_PASSWORD || 'testtest1'}`;
const authHeader = `Basic ${encoding.b64encode(credentials)}`;
const baseUrl = __ENV.NEO4J_URL || 'http://localhost:7474';

export const options = {
  vus: Number(__ENV.VUS || 10),
  duration: __ENV.DURATION || '10s',
  thresholds: {
    http_req_duration: ['p(95)<150'],
    checks: ['rate>0.95'],
  },
};

export default function () {
  const payload = JSON.stringify({
    statements: [
      {
        statement: `
          MATCH (log:CompensationLog)
          USING INDEX log:CompensationLog(tenantId, status)
          WHERE log.tenantId = $tenantId AND log.status = $status
          OPTIONAL MATCH (log)-[:HAS_COMPENSATOR]->(c:Compensator)
          RETURN log.id AS logId, count(c) AS compensatorCount
          ORDER BY log.timestamp DESC
          LIMIT 50
        `,
        parameters: {
          tenantId: __ENV.TEST_TENANT || 'tenant-1',
          status: __ENV.TEST_STATUS || 'COMPLETED',
        },
      },
    ],
  });

  const res = http.post(`${baseUrl}/db/neo4j/tx/commit`, payload, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader,
    },
  });

  check(res, {
    'status is 200': (r) => r.status === 200,
    'returns rows': (r) => (r.json('results[0].data.length') || 0) >= 0,
  });

  sleep(0.1);
}
