import http from 'k6/http';
import { Trend } from 'k6/metrics';
import { check, sleep } from 'k6';

const GRAPHQL_URL = __ENV.GRAPHQL_URL || 'http://localhost:4000/graphql';
const AUTH_TOKEN = __ENV.GRAPHQL_TOKEN || '';
const HEADERS = {
  'Content-Type': 'application/json',
  ...(AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {}),
};

const pagerankTrend = new Trend('graph_pagerank_duration_ms');
const communityTrend = new Trend('graph_communities_duration_ms');

const PAGE_RANK_QUERY = `
  query PageRank($limit: Int, $force: Boolean) {
    graphPageRank(limit: $limit, forceRefresh: $force) {
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

export const options = {
  scenarios: {
    pagerank: {
      executor: 'constant-vus',
      exec: 'runPageRank',
      vus: Number(__ENV.K6_PAGERANK_VUS || 5),
      duration: __ENV.K6_DURATION || '30s',
    },
    communities: {
      executor: 'ramping-arrival-rate',
      exec: 'runCommunities',
      startRate: Number(__ENV.K6_COMMUNITIES_START_RATE || 5),
      timeUnit: '1s',
      preAllocatedVUs: Number(__ENV.K6_COMMUNITIES_VUS || 10),
      stages: [
        {
          target: Number(__ENV.K6_COMMUNITIES_PEAK_RATE || 25),
          duration: '30s',
        },
        {
          target: Number(__ENV.K6_COMMUNITIES_PEAK_RATE || 25),
          duration: '30s',
        },
        { target: Number(__ENV.K6_COMMUNITIES_END_RATE || 5), duration: '20s' },
      ],
    },
  },
  thresholds: {
    graph_pagerank_duration_ms: ['p(95)<2000', 'avg<1000'],
    graph_communities_duration_ms: ['p(95)<2500', 'avg<1200'],
    http_req_failed: ['rate<0.01'],
  },
};

function postGraphQL(query, variables = {}) {
  const payload = JSON.stringify({ query, variables });
  const res = http.post(GRAPHQL_URL, payload, { headers: HEADERS });
  return res;
}

export function runPageRank() {
  const res = postGraphQL(PAGE_RANK_QUERY, {
    limit: Number(__ENV.K6_PAGERANK_LIMIT || 50),
    force: false,
  });

  pagerankTrend.add(res.timings.duration);

  check(res, {
    'pagerank status 200': (r) => r.status === 200,
    'pagerank has data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body?.data?.graphPageRank);
      } catch (error) {
        return false;
      }
    },
  });

  sleep(Number(__ENV.K6_SLEEP || 1));
}

export function runCommunities() {
  const res = postGraphQL(COMMUNITIES_QUERY, {
    limit: Number(__ENV.K6_COMMUNITIES_LIMIT || 20),
    algorithm: __ENV.K6_COMMUNITIES_ALGO || 'LOUVAIN',
  });

  communityTrend.add(res.timings.duration);

  check(res, {
    'communities status 200': (r) => r.status === 200,
    'communities has data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body?.data?.graphCommunities);
      } catch (error) {
        return false;
      }
    },
  });

  sleep(Number(__ENV.K6_SLEEP || 1));
}
