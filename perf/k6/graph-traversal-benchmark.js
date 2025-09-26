import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

export const options = {
  tags: { component: 'graphql', suite: 'graph-traversal' },
  scenarios: {
    traversal_ramp: {
      executor: 'ramping-arrival-rate',
      startRate: Number(__ENV.GRAPH_TRAVERSAL_START_RPS || 2),
      timeUnit: '1s',
      preAllocatedVUs: Number(__ENV.GRAPH_TRAVERSAL_PREALLOCATED_VUS || 20),
      maxVUs: Number(__ENV.GRAPH_TRAVERSAL_MAX_VUS || 60),
      stages: [
        { target: Number(__ENV.GRAPH_TRAVERSAL_PEAK_RPS || 12), duration: '4m' },
        { target: Number(__ENV.GRAPH_TRAVERSAL_PEAK_RPS || 12), duration: '3m' },
        { target: Number(__ENV.GRAPH_TRAVERSAL_END_RPS || 4), duration: '2m' }
      ],
      exec: 'traversal'
    }
  },
  thresholds: {
    http_req_failed: ['rate<0.02'],
    'http_req_duration{scenario:traversal_ramp}': ['p(95)<1500', 'p(99)<2200'],
    graphql_traversal_duration: ['avg<800', 'p(95)<1500'],
    graphql_traversal_node_load: ['p(95)>=100'],
    traversal_checks: ['rate>0.97']
  }
};

const graphqlUrl = __ENV.GRAPHQL_URL || 'http://localhost:4000/graphql';
const investigationId = __ENV.GRAPH_TRAVERSAL_INVESTIGATION_ID || 'investigation-001';
const radius = Number(__ENV.GRAPH_TRAVERSAL_RADIUS || 3);
const minNodes = Number(__ENV.GRAPH_TRAVERSAL_MIN_NODES || 100);
const entityIds = (__ENV.GRAPH_TRAVERSAL_ENTITY_IDS || 'entity-001')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean);

const traversalTrend = new Trend('graphql_traversal_duration');
const traversalNodeTrend = new Trend('graphql_traversal_node_load');
const traversalEdgeTrend = new Trend('graphql_traversal_edge_load');
const traversalErrorRate = new Rate('graphql_traversal_errors');
const traversalIterations = new Counter('graphql_traversal_iterations');

const traversalQuery = `mutation ExpandNeighborhood($entityId: ID!, $investigationId: ID!, $radius: Int!) {
  expandNeighborhood(entityId: $entityId, investigationId: $investigationId, radius: $radius) {
    nodes { id label type }
    edges { id source target type }
  }
}`;

function pickEntity(iteration) {
  if (entityIds.length === 0) {
    return 'entity-001';
  }
  const idx = iteration % entityIds.length;
  return entityIds[idx];
}

function traversalPayload(entityId) {
  return JSON.stringify({
    query: traversalQuery,
    variables: { entityId, investigationId, radius }
  });
}

export function traversal() {
  const iteration = __ITER || 0;
  const entityId = pickEntity(iteration + __VU);

  group('graph traversal', () => {
    const body = traversalPayload(entityId);
    const start = Date.now();
    const res = http.post(graphqlUrl, body, {
      headers: {
        'Content-Type': 'application/json',
        'X-Test-Scenario': 'graph-traversal'
      },
      tags: { operation: 'mutation', graph_operation: 'expandNeighborhood' }
    });

    traversalIterations.add(1);

    const ok = check(res, {
      'status is 200': (r) => r.status === 200,
      'has payload': (r) => Boolean(r.json('data.expandNeighborhood')),
      'node load met': (r) => (r.json('data.expandNeighborhood.nodes.length') || 0) >= minNodes,
      'edge load present': (r) => (r.json('data.expandNeighborhood.edges.length') || 0) > 0
    });

    if (!ok) {
      traversalErrorRate.add(1);
    }

    const duration = Date.now() - start;
    traversalTrend.add(duration);

    const nodes = res.json('data.expandNeighborhood.nodes.length') || 0;
    const edges = res.json('data.expandNeighborhood.edges.length') || 0;
    traversalNodeTrend.add(nodes);
    traversalEdgeTrend.add(edges);

    sleep(Number(__ENV.GRAPH_TRAVERSAL_SLEEP || 0.2));
  });
}
