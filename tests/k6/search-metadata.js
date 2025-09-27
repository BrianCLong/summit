import http from 'k6/http';
import { check, sleep, Trend } from 'k6';
import { randomItem } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

export const options = {
  scenarios: {
    metadata_search: {
      executor: 'constant-vus',
      vus: Number(__ENV.VUS || 10),
      duration: __ENV.DURATION || '2m',
      gracefulStop: '30s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<300', 'p(99)<500'],
    checks: ['rate>0.99'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4006';
const AUTH_TOKEN = __ENV.AUTH_TOKEN;

if (!AUTH_TOKEN) {
  throw new Error('AUTH_TOKEN environment variable is required for the search metadata test');
}

const responseTimeTrend = new Trend('search_metadata_response_time', true);

const queries = [
  {
    name: 'projects_by_keyword',
    text: 'Project Alpha risk assessment',
    filters: { entityTypes: ['Project'] },
  },
  {
    name: 'people_and_assets',
    text: 'Alice relationships hardware assets',
    filters: { entityTypes: ['Person', 'Asset'] },
  },
  {
    name: 'supply_chain',
    text: 'supply chain vendor delays',
    filters: { tags: ['supply-chain'] },
  },
  {
    name: 'threat_intel',
    text: 'credential leak investigation',
    filters: { sources: ['threat-intel'] },
  },
];

const requestHeaders = {
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${AUTH_TOKEN}`,
  },
};

export default function metadataSearch() {
  const query = randomItem(queries);
  const body = {
    query: query.text,
    searchType: 'hybrid',
    filters: query.filters,
    pagination: { page: 1, size: 10 },
    highlight: { fields: ['name', 'summary'], fragmentSize: 120, numberOfFragments: 2 },
  };

  const response = http.post(`${BASE_URL}/api/search/search`, JSON.stringify(body), requestHeaders);

  responseTimeTrend.add(response.timings.duration, { scenario: query.name });

  check(response, {
    'status is 200': (res) => res.status === 200,
    'body parses to JSON': (res) => !!res.json(),
    'returned results quickly': (res) => res.timings.duration < 400,
  });

  sleep(Number(__ENV.SLEEP || '1'));
}
