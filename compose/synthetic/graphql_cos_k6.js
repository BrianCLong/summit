import http from 'k6/http';
import { sleep } from 'k6';

export const options = {
  scenarios: {
    steady: {
      executor: 'constant-arrival-rate',
      rate: Number(__ENV.RATE || 30),
      timeUnit: '1s',
      duration: '0h30m0s',
      preAllocatedVUs: 50,
    },
  },
  thresholds: {}, // no gating in compose; just generate traffic
};

export default function () {
  const url = __ENV.COS_GQL_URL || 'http://cos:3000/graphql';
  const q = JSON.stringify({ query: '{ __typename }' });
  http.post(url, q, { headers: { 'Content-Type': 'application/json' } });
  sleep(0.05);
}

