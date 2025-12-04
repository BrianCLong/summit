
import cases from './scenarios/cases.js';
import graphql from './scenarios/graphql.js';
import search from './scenarios/search.js';
import { config } from './config.js';

export const options = {
  scenarios: {
    cases_scenario: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: config.vus },
        { duration: config.duration, target: config.vus },
        { duration: '30s', target: 0 },
      ],
      gracefulStop: '0s',
      exec: 'runCases',
    },
    graphql_scenario: {
      executor: 'constant-vus',
      vus: Math.max(1, Math.floor(config.vus / 2)),
      duration: config.duration,
      exec: 'runGraphql',
    },
    search_scenario: {
      executor: 'constant-vus',
      vus: Math.max(1, Math.floor(config.vus / 4)),
      duration: config.duration,
      exec: 'runSearch',
    },
  },
  thresholds: {
    'http_req_duration': ['p(95)<2000'], // 95% of requests must complete below 2s
    'errors_cases': ['rate<0.05'],
    'errors_graphql': ['rate<0.01'],
    'errors_search': ['rate<0.01'],
  },
};

export function runCases() {
  cases();
}

export function runGraphql() {
  graphql();
}

export function runSearch() {
  search();
}
