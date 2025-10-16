import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const apiResponseTime = new Trend('api_response_time');
const pageLoadTime = new Trend('page_load_time');
const routeChangeTime = new Trend('route_change_time');

export const options = {
  stages: [
    { duration: '2m', target: 10 }, // Ramp up
    { duration: '5m', target: 10 }, // Stay at 10 users
    { duration: '2m', target: 20 }, // Ramp to 20 users
    { duration: '5m', target: 20 }, // Stay at 20 users
    { duration: '2m', target: 0 }, // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests must complete below 2s
    http_req_failed: ['rate<0.01'], // Error rate must be below 1%
    api_response_time: ['p(95)<800'], // API response time
    page_load_time: ['p(95)<2500'], // Page load time
    route_change_time: ['p(95)<250'], // Route change time
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5173';
const API_BASE = '/api/maestro/v1';

export default function () {
  group('Maestro UI Performance Tests', () => {
    group('Initial Page Load', () => {
      const startTime = Date.now();
      const response = http.get(`${BASE_URL}/maestro`);
      const loadTime = Date.now() - startTime;

      check(response, {
        'status is 200': (r) => r.status === 200,
        'page loads within 2.5s': (r) => loadTime < 2500,
        'contains Maestro title': (r) => r.body.includes('Maestro'),
      });

      pageLoadTime.add(loadTime);
      errorRate.add(response.status >= 400);
    });

    group('API Endpoints Performance', () => {
      // Test runs API
      group('Runs API', () => {
        const startTime = Date.now();
        const response = http.get(`${BASE_URL}${API_BASE}/runs`);
        const responseTime = Date.now() - startTime;

        check(response, {
          'runs API status 200': (r) => r.status === 200,
          'runs API responds within 800ms': (r) => responseTime < 800,
          'runs API returns JSON': (r) =>
            r.headers['Content-Type']?.includes('application/json'),
        });

        apiResponseTime.add(responseTime);
        errorRate.add(response.status >= 400);
      });

      // Test individual run details
      group('Run Details API', () => {
        const runId = 'run_' + Math.floor(Math.random() * 1000);
        const startTime = Date.now();
        const response = http.get(`${BASE_URL}${API_BASE}/runs/${runId}`);
        const responseTime = Date.now() - startTime;

        check(response, {
          'run details responds': (r) => r.status >= 200 && r.status < 500,
          'run details responds within 800ms': (r) => responseTime < 800,
        });

        apiResponseTime.add(responseTime);
        errorRate.add(response.status >= 400);
      });

      // Test streaming endpoint (without actually streaming)
      group('Logs Streaming Endpoint', () => {
        const runId = 'run_' + Math.floor(Math.random() * 1000);
        const startTime = Date.now();
        const response = http.get(`${BASE_URL}${API_BASE}/runs/${runId}/logs`);
        const responseTime = Date.now() - startTime;

        check(response, {
          'logs endpoint responds': (r) => r.status >= 200 && r.status < 500,
          'logs endpoint responds within 500ms': (r) => responseTime < 500,
        });

        apiResponseTime.add(responseTime);
        errorRate.add(response.status >= 400);
      });
    });

    group('User Workflows', () => {
      group('Dashboard to Runs Navigation', () => {
        // Simulate navigating from dashboard to runs
        let response = http.get(`${BASE_URL}/maestro`);
        check(response, {
          'dashboard loads': (r) => r.status === 200,
        });

        sleep(0.5); // Simulate user reading time

        const startTime = Date.now();
        response = http.get(`${BASE_URL}/maestro/runs`);
        const routeTime = Date.now() - startTime;

        check(response, {
          'runs page loads': (r) => r.status === 200,
          'route change within 250ms': (r) => routeTime < 250,
        });

        routeChangeTime.add(routeTime);
        errorRate.add(response.status >= 400);
      });

      group('Run Details Workflow', () => {
        // Navigate to a specific run
        const runId = 'run_' + Math.floor(Math.random() * 1000);

        const startTime = Date.now();
        const response = http.get(`${BASE_URL}/maestro/runs/${runId}`);
        const routeTime = Date.now() - startTime;

        check(response, {
          'run detail page responds': (r) => r.status >= 200,
          'run detail loads within 1s': (r) => routeTime < 1000,
        });

        routeChangeTime.add(routeTime);
        errorRate.add(response.status >= 400);
      });
    });

    group('Static Assets Performance', () => {
      // Test CSS loading
      const cssResponse = http.get(`${BASE_URL}/maestro/assets/index.css`, {
        headers: { Accept: 'text/css' },
      });

      check(cssResponse, {
        'CSS loads successfully': (r) => r.status === 200,
        'CSS has caching headers': (r) =>
          r.headers['Cache-Control'] !== undefined,
      });

      // Test JS bundle loading
      const jsResponse = http.get(`${BASE_URL}/maestro/assets/index.js`, {
        headers: { Accept: 'application/javascript' },
      });

      check(jsResponse, {
        'JS loads successfully': (r) => r.status === 200,
        'JS has caching headers': (r) =>
          r.headers['Cache-Control'] !== undefined,
        'JS bundle size reasonable': (r) => r.body.length < 500000, // 500KB limit
      });
    });

    group('Concurrent User Simulation', () => {
      // Simulate multiple API calls that a user might make simultaneously
      const requests = [
        ['GET', `${BASE_URL}${API_BASE}/runs`],
        ['GET', `${BASE_URL}${API_BASE}/budgets`],
        ['GET', `${BASE_URL}${API_BASE}/providers`],
      ];

      const responses = http.batch(
        requests.map(([method, url]) => [method, url]),
      );

      responses.forEach((response, index) => {
        const endpoint = requests[index][1];
        check(response, {
          [`${endpoint} responds successfully`]: (r) =>
            r.status >= 200 && r.status < 400,
          [`${endpoint} responds quickly`]: (r) => r.timings.duration < 1000,
        });

        errorRate.add(response.status >= 400);
      });
    });

    sleep(1); // Think time between iterations
  });
}

export function handleSummary(data) {
  return {
    'performance-summary.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, options = {}) {
  const indent = options.indent || '';
  const colors = options.enableColors !== false;

  let summary = `${indent}Performance Test Summary\n`;
  summary += `${indent}========================\n\n`;

  // Add key metrics
  const httpReqDuration = data.metrics.http_req_duration;
  const httpReqFailed = data.metrics.http_req_failed;

  if (httpReqDuration) {
    summary += `${indent}HTTP Request Duration:\n`;
    summary += `${indent}  Average: ${httpReqDuration.values.avg.toFixed(2)}ms\n`;
    summary += `${indent}  P95: ${httpReqDuration.values['p(95)'].toFixed(2)}ms\n`;
    summary += `${indent}  P99: ${httpReqDuration.values['p(99)'].toFixed(2)}ms\n\n`;
  }

  if (httpReqFailed) {
    const errorPercent = (httpReqFailed.values.rate * 100).toFixed(2);
    summary += `${indent}Error Rate: ${errorPercent}%\n\n`;
  }

  // Add custom metrics
  ['api_response_time', 'page_load_time', 'route_change_time'].forEach(
    (metric) => {
      const metricData = data.metrics[metric];
      if (metricData) {
        summary += `${indent}${metric}:\n`;
        summary += `${indent}  Average: ${metricData.values.avg.toFixed(2)}ms\n`;
        summary += `${indent}  P95: ${metricData.values['p(95)'].toFixed(2)}ms\n\n`;
      }
    },
  );

  return summary;
}
