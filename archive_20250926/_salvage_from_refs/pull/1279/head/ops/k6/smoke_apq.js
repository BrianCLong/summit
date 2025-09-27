import { gql } from './lib/graphql.js';
import { check } from 'k6';

export const options = { vus: 5, iterations: 50 };

export default function () {
  const res = gql(__ENV.API_URL, '{__typename}', {}, { 'x-apq-hash': __ENV.APQ_HASH });
  check(res, { '200': (r) => r.status === 200 });
}

