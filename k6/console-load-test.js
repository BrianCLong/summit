import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

export let errorRate = new Rate('errors');

export let options = {
  stages: [
    { duration: '1m', target: 5 }, // ramp up to 5 users
    { duration: '2m', target: 20 }, // stay at 20 users
    { duration: '1m', target: 0 }, // ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'], // 95% of requests should be below 1000ms
    errors: ['rate<0.05'], // error rate should be below 5%
  },
};

export default function () {
  const res = http.get('http://console.topicality.co');

  check(res, {
    'is status 200': (r) => r.status === 200,
    'body contains CompanyOS': (r) => r.body.includes('CompanyOS Console'),
  }) || errorRate.add(1);

  sleep(2);
}
