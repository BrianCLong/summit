import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const SUBGRAPH_URL = __ENV.SUBGRAPH_URL ?? 'http://localhost:4003/graphql';
const TEST_NODE_ID = __ENV.TEST_NODE_ID ?? 'incident-100';
const LIMIT = Number.parseInt(__ENV.NEIGHBOR_LIMIT ?? '15', 10);

const latencyTrend = new Trend('neighborhood_latency_ms');
const cacheHitRatio = new Rate('neighborhood_cache_hit_ratio');

const query = `#graphql
  query Neighborhood($nodeId: ID!, $limit: Int!, $direction: Direction!) {
    nodeNeighborhood(nodeId: $nodeId, limit: $limit, direction: $direction) {
      node { id labels }
      neighbors { id labels }
      edges { id type startId endId }
      pageInfo { endCursor hasNextPage }
    }
  }
`;

export const options = {
  discardResponseBodies: false,
  thresholds: {
    http_req_duration: ['p(95)<300'],
    neighborhood_latency_ms: ['p(95)<300'],
    neighborhood_cache_hit_ratio: ['rate>0.4']
  },
  scenarios: {
    steady_load: {
      executor: 'constant-arrival-rate',
      duration: __ENV.DURATION ?? '1m',
      rate: Number.parseInt(__ENV.RATE ?? '25', 10),
      timeUnit: '1s'
    }
  }
};

export default function () {
  const payload = JSON.stringify({
    query,
    variables: {
      nodeId: TEST_NODE_ID,
      limit: LIMIT,
      direction: 'BOTH'
    }
  });

  const res = http.post(SUBGRAPH_URL, payload, {
    headers: { 'Content-Type': 'application/json' }
  });

  check(res, {
    'status is 200': r => r.status === 200,
    'no graphql errors': r => !(r.json('errors') ?? []).length
  });

  const extensions = res.json('extensions');
  const cost = extensions?.cost;
  if (cost?.operations) {
    const neighborhood = cost.operations.find(op => op.operation === 'nodeNeighborhood');
    if (neighborhood?.metrics?.resultConsumedAfterMs != null) {
      latencyTrend.add(neighborhood.metrics.resultConsumedAfterMs);
    }
    if (neighborhood?.meta?.cache?.hit != null) {
      cacheHitRatio.add(neighborhood.meta.cache.hit ? 1 : 0);
    }
  }

  sleep(Number.parseFloat(__ENV.SLEEP ?? '0.1'));
}
