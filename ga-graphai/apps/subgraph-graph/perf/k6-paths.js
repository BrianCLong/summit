import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const SUBGRAPH_URL = __ENV.SUBGRAPH_URL ?? 'http://localhost:4003/graphql';
const START_NODE_ID = __ENV.START_NODE_ID ?? 'incident-100';
const LIMIT = Number.parseInt(__ENV.PATH_LIMIT ?? '5', 10);

const latencyTrend = new Trend('path_latency_ms');
const cacheHitRatio = new Rate('path_cache_hit_ratio');

const query = `#graphql
  query FilteredPaths($input: PathInput!) {
    filteredPaths(input: $input) {
      paths {
        nodes { id labels }
        edges { id type startId endId }
      }
      pageInfo { endCursor hasNextPage }
    }
  }
`;

function randomDirection() {
  const directions = ['OUT', 'IN', 'BOTH'];
  return directions[Math.floor(Math.random() * directions.length)];
}

export const options = {
  discardResponseBodies: false,
  thresholds: {
    http_req_duration: ['p(95)<1200'],
    path_latency_ms: ['p(95)<1200'],
    path_cache_hit_ratio: ['rate<0.05']
  },
  scenarios: {
    randomized_paths: {
      executor: 'constant-vus',
      vus: Number.parseInt(__ENV.VUS ?? '12', 10),
      duration: __ENV.DURATION ?? '1m'
    }
  }
};

export default function () {
  const payload = JSON.stringify({
    query,
    variables: {
      input: {
        startId: START_NODE_ID,
        maxHops: 3,
        limit: LIMIT,
        direction: randomDirection(),
        labelFilters: Math.random() > 0.5 ? ['Incident', 'Observable'] : [],
        relationshipTypes: Math.random() > 0.5 ? ['INDICATES', 'LINKED'] : [],
        propertyFilters: []
      }
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
    const pathOp = cost.operations.find(op => op.operation === 'filteredPaths');
    if (pathOp?.metrics?.resultConsumedAfterMs != null) {
      latencyTrend.add(pathOp.metrics.resultConsumedAfterMs);
    }
    if (pathOp?.meta?.cache?.hit != null) {
      cacheHitRatio.add(pathOp.meta.cache.hit ? 1 : 0);
    }
  }

  sleep(Number.parseFloat(__ENV.SLEEP ?? '0.2'));
}
