import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';

const GRAPHQL_URL = __ENV.GRAPHQL_URL || 'http://localhost:4000/graphql';
const AUTH_TOKEN = __ENV.GRAPHQL_TOKEN || '';
const TENANT_ID = __ENV.TENANT_ID || 'demo';
const HEADERS = {
  'Content-Type': 'application/json',
  ...(AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {}),
  'x-tenant-id': TENANT_ID,
};

const neo4jLatency = new Trend('graphql_neo4j_latency_ms');
const postgresLatency = new Trend('graphql_postgres_latency_ms');
const neo4jCalls = new Counter('graphql_neo4j_calls');
const postgresCalls = new Counter('graphql_postgres_calls');

const PAGE_RANK_QUERY = `
  query PageRank($limit: Int, $force: Boolean, $concurrency: Int) {
    graphPageRank(limit: $limit, forceRefresh: $force, concurrency: $concurrency) {
      nodeId
      score
    }
  }
`;

const COMMUNITIES_QUERY = `
  query Communities($limit: Int, $algorithm: CommunityDetectionAlgorithm) {
    graphCommunities(limit: $limit, algorithm: $algorithm) {
      communityId
      size
      algorithm
    }
  }
`;

const STATS_QUERY = `
  query Stats {
    summaryStats {
      entities
      relationships
      investigations
    }
    caseCounts {
      total
      byStatus
    }
  }
`;

function postGraphQL(query, variables = {}) {
  const payload = JSON.stringify({ query, variables });
  return http.post(GRAPHQL_URL, payload, { headers: HEADERS });
}

function parseJson(body) {
  try {
    return JSON.parse(body);
  } catch (error) {
    return null;
  }
}

export const options = {
  scenarios: {
    neo4j_scale: {
      executor: 'ramping-arrival-rate',
      exec: 'neo4jScenario',
      startRate: Number(__ENV.NEO4J_START_RATE || 5),
      timeUnit: '1s',
      preAllocatedVUs: Number(__ENV.NEO4J_VUS || 20),
      stages: [
        {
          target: Number(__ENV.NEO4J_PEAK_RATE || 35),
          duration: __ENV.NEO4J_RAMP_DURATION || '45s',
        },
        {
          target: Number(__ENV.NEO4J_PEAK_RATE || 35),
          duration: __ENV.NEO4J_PEAK_HOLD || '1m',
        },
        { target: Number(__ENV.NEO4J_END_RATE || 8), duration: __ENV.NEO4J_COOLDOWN || '30s' },
      ],
    },
    postgres_scale: {
      executor: 'constant-arrival-rate',
      exec: 'postgresScenario',
      rate: Number(__ENV.PG_RATE || 20),
      timeUnit: '1s',
      duration: __ENV.PG_DURATION || '2m',
      preAllocatedVUs: Number(__ENV.PG_VUS || 15),
      maxVUs: Number(__ENV.PG_MAX_VUS || 50),
    },
  },
  thresholds: {
    graphql_neo4j_latency_ms: ['p(95)<2000', 'avg<1200'],
    graphql_postgres_latency_ms: ['p(95)<750', 'avg<500'],
    http_req_failed: ['rate<0.02'],
  },
};

export function neo4jScenario() {
  const forceRefresh = __ENV.NEO4J_FORCE_REFRESH === 'true';
  const concurrency = Number(__ENV.NEO4J_CONCURRENCY || 8);
  const mode = (__ENV.NEO4J_QUERY || 'mixed').toLowerCase();
  const useCommunities =
    mode === 'communities' ? true : mode === 'pagerank' ? false : Math.random() > 0.5;
  const variables = useCommunities
    ? {
        limit: Number(__ENV.NEO4J_LIMIT || 50),
        algorithm: __ENV.NEO4J_ALGO || 'LOUVAIN',
      }
    : {
        limit: Number(__ENV.NEO4J_LIMIT || 50),
        force: forceRefresh,
        concurrency,
      };

  const query = useCommunities ? COMMUNITIES_QUERY : PAGE_RANK_QUERY;
  const res = postGraphQL(query, variables);
  const body = parseJson(res.body);

  neo4jLatency.add(res.timings.duration);
  neo4jCalls.add(1);

  check(res, {
    'neo4j status 200': (r) => r.status === 200,
    'neo4j data returned': () => {
      if (!body) return false;
      if (Array.isArray(body?.errors) && body.errors.length > 0) return false;
      if (useCommunities) {
        return Array.isArray(body?.data?.graphCommunities);
      }
      return Array.isArray(body?.data?.graphPageRank);
    },
  });

  sleep(Number(__ENV.NEO4J_SLEEP || 0.5));
}

export function postgresScenario() {
  const res = postGraphQL(STATS_QUERY);
  const body = parseJson(res.body);

  postgresLatency.add(res.timings.duration);
  postgresCalls.add(1);

  check(res, {
    'postgres status 200': (r) => r.status === 200,
    'postgres stats present': () => {
      if (!body?.data) return false;
      if (Array.isArray(body?.errors) && body.errors.length > 0) return false;
      const stats = body.data.summaryStats;
      const counts = body.data.caseCounts;
      return (
        typeof stats?.entities === 'number' &&
        typeof stats?.relationships === 'number' &&
        typeof stats?.investigations === 'number' &&
        typeof counts?.total === 'number'
      );
    },
  });

  sleep(Number(__ENV.PG_SLEEP || 0.25));
}
