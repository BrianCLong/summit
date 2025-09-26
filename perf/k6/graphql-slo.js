import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';

const QUERY_BODY = JSON.stringify({
  query: '{\n  health {\n    ok\n    timestamp\n  }\n}'
});

const expandNeighborhoodTrend = new Trend('graphql_expand_neighborhood_duration');
const expandNeighborhoodNodes = new Trend('graphql_expand_neighborhood_nodes');
const expandNeighborhoodEdges = new Trend('graphql_expand_neighborhood_edges');

export const options = {
  tags: { component: 'graphql', scenario: 'slo-validation' },
  scenarios: {
    steady_queries: {
      executor: 'constant-arrival-rate',
      rate: Number(__ENV.GRAPHQL_QUERY_RPS || 40),
      duration: __ENV.GRAPHQL_TEST_DURATION || '2m',
      preAllocatedVUs: Number(__ENV.GRAPHQL_PREALLOCATED_VUS || 20),
      timeUnit: '1s',
      exec: 'executeQuery'
    },
    steady_mutations: {
      executor: 'constant-arrival-rate',
      rate: Number(__ENV.GRAPHQL_MUTATION_RPS || 10),
      duration: __ENV.GRAPHQL_TEST_DURATION || '2m',
      preAllocatedVUs: Number(__ENV.GRAPHQL_PREALLOCATED_VUS || 10),
      timeUnit: '1s',
      exec: 'executeMutation'
    },
    expand_neighborhood: {
      executor: 'constant-arrival-rate',
      rate: Number(__ENV.GRAPH_TRAVERSAL_RPS || 6),
      duration: __ENV.GRAPH_TRAVERSAL_DURATION || '3m',
      preAllocatedVUs: Number(__ENV.GRAPH_TRAVERSAL_VUS || 12),
      timeUnit: '1s',
      exec: 'executeExpandNeighborhood'
    }
  },
  thresholds: {
    'http_req_duration{operation:query}': ['p(95)<350', 'p(99)<900'],
    'http_req_duration{operation:mutation}': ['p(95)<700', 'p(99)<1500'],
    'http_req_duration{scenario:expand_neighborhood}': ['p(95)<1500', 'p(99)<2200', 'avg<800'],
    'checks{scenario:expand_neighborhood}': ['rate>0.98'],
    'graphql_expand_neighborhood_duration': ['p(95)<1500'],
    checks: ['rate>0.99']
  }
};

const graphqlUrl = __ENV.GRAPHQL_URL || 'http://localhost:4000/graphql';
const mutationBody = JSON.stringify({
  query: 'mutation Ping($input: PingInput!) {\n  ping(input: $input) {\n    ok\n  }\n}',
  variables: { input: { message: 'k6-slo-check', timestamp: new Date().toISOString() } }
});

const traversalEntityId = __ENV.GRAPH_TRAVERSAL_ENTITY_ID || 'entity-001';
const traversalInvestigationId = __ENV.GRAPH_TRAVERSAL_INVESTIGATION_ID || 'investigation-001';
const traversalRadius = Number(__ENV.GRAPH_TRAVERSAL_RADIUS || 3);

const expandNeighborhoodBody = () =>
  JSON.stringify({
    query: `mutation ExpandNeighborhood($entityId: ID!, $investigationId: ID!, $radius: Int!) {
      expandNeighborhood(entityId: $entityId, investigationId: $investigationId, radius: $radius) {
        nodes { id label type tags }
        edges { id source target type label }
      }
    }
  `,
    variables: {
      entityId: traversalEntityId,
      investigationId: traversalInvestigationId,
      radius: traversalRadius
    }
  });

export function executeQuery() {
  const response = http.post(graphqlUrl, QUERY_BODY, {
    headers: { 'Content-Type': 'application/json', 'X-Test-Scenario': 'query-slo' }
  });
  check(response, {
    'query succeeded': (res) => res.status === 200 && res.json('data.health.ok') === true
  });
  sleep(0.1);
}

export function executeMutation() {
  const response = http.post(graphqlUrl, mutationBody, {
    headers: { 'Content-Type': 'application/json', 'X-Test-Scenario': 'mutation-slo' }
  });
  check(response, {
    'mutation succeeded': (res) => res.status === 200 && res.json('data.ping.ok') === true
  });
  sleep(0.2);
}

export function executeExpandNeighborhood() {
  const body = expandNeighborhoodBody();
  const start = Date.now();
  const response = http.post(graphqlUrl, body, {
    headers: {
      'Content-Type': 'application/json',
      'X-Test-Scenario': 'expand-neighborhood'
    },
    tags: { operation: 'mutation', graph_operation: 'expandNeighborhood' }
  });

  const ok = check(response, {
    'expandNeighborhood succeeded': (res) => {
      if (res.status !== 200) {
        return false;
      }
      const nodes = res.json('data.expandNeighborhood.nodes.length') || 0;
      const edges = res.json('data.expandNeighborhood.edges.length') || 0;
      expandNeighborhoodNodes.add(nodes);
      expandNeighborhoodEdges.add(edges);
      return nodes > 0 && edges > 0;
    }
  });

  if (ok) {
    expandNeighborhoodTrend.add(Date.now() - start);
  }

  sleep(Number(__ENV.GRAPH_TRAVERSAL_SLEEP || 0.3));
}

export default function () {
  executeQuery();
}
