import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 20,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<1500'],
    http_req_failed: ['rate<0.05'],
  },
};

function fetchPage(baseUrl, cursor, limit) {
  const url = `${baseUrl}/api/entities?limit=${limit}${cursor ? `&cursor=${cursor}` : ''}`;
  const res = http.get(url, { tags: { endpoint: 'entities' } });
  check(res, {
    'status is 200': (r) => r.status === 200,
    'has pageInfo': (r) => !!r.json('pageInfo'),
  });
  return res.json();
}

export default function () {
  const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';
  const limit = 200;
  let cursor = '';
  for (let i = 0; i < 3; i += 1) {
    const page = fetchPage(baseUrl, cursor, limit);
    cursor = page?.pageInfo?.nextCursor || '';
    if (!cursor) break;
  }
  sleep(1);
}
