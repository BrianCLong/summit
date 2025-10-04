import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const loginDuration = new Trend('login_duration', true);
const queryDuration = new Trend('query_duration', true);
const graphRenderDuration = new Trend('graph_render_duration', true);
const exportDuration = new Trend('export_duration', true);
const goldenFlowSuccessRate = new Rate('golden_flow_success');
const goldenFlowTotal = new Counter('golden_flow_total');
const goldenFlowSuccess = new Counter('golden_flow_success_total');

// SLO thresholds aligned with Grafana dashboards
export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up
    { duration: '1m', target: 10 },   // Steady state
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    // SLO: p95 API latency < 1.5s
    'http_req_duration{type:api}': ['p(95)<1500'],

    // SLO: Login < 2s
    'login_duration': ['p(95)<2000'],

    // SLO: Query < 1.5s
    'query_duration': ['p(95)<1500'],

    // SLO: Graph render < 3s
    'graph_render_duration': ['p(95)<3000'],

    // SLO: Export < 5s
    'export_duration': ['p(95)<5000'],

    // SLO: Golden flow success rate > 99%
    'golden_flow_success': ['rate>0.99'],

    // HTTP error rate < 1%
    'http_req_failed': ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_URL = `${BASE_URL}/api`;

export default function () {
  goldenFlowTotal.add(1);
  let flowSuccess = true;

  // Step 1: Login
  group('1. Login', function () {
    const loginStart = Date.now();
    const loginRes = http.post(`${API_URL}/auth/login`, JSON.stringify({
      username: 'testuser@example.com',
      password: 'testpass123',
    }), {
      headers: { 'Content-Type': 'application/json' },
      tags: { type: 'api', endpoint: 'login' },
    });

    const loginOk = check(loginRes, {
      'login status is 200': (r) => r.status === 200,
      'login returns token': (r) => r.json('token') !== undefined,
    });

    if (!loginOk) flowSuccess = false;

    loginDuration.add(Date.now() - loginStart);

    const token = loginRes.json('token');
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };

    sleep(0.5);

    // Step 2: Execute Query
    group('2. Query Graph', function () {
      const queryStart = Date.now();
      const queryRes = http.post(`${API_URL}/graphql`, JSON.stringify({
        query: `
          query GoldenFlow {
            entities(limit: 50) {
              id
              type
              properties
              edges {
                id
                target {
                  id
                  type
                }
              }
            }
          }
        `,
      }), {
        headers,
        tags: { type: 'api', endpoint: 'graphql' },
      });

      const queryOk = check(queryRes, {
        'query status is 200': (r) => r.status === 200,
        'query returns data': (r) => r.json('data') !== undefined,
        'no graphql errors': (r) => !r.json('errors'),
      });

      if (!queryOk) flowSuccess = false;

      queryDuration.add(Date.now() - queryStart);
    });

    sleep(0.5);

    // Step 3: Render Graph (simulate UI request)
    group('3. Graph Render', function () {
      const renderStart = Date.now();
      const renderRes = http.post(`${API_URL}/graph/render`, JSON.stringify({
        entityIds: ['ent_001', 'ent_002', 'ent_003'],
        depth: 2,
        layout: 'force-directed',
      }), {
        headers,
        tags: { type: 'api', endpoint: 'render' },
      });

      const renderOk = check(renderRes, {
        'render status is 200': (r) => r.status === 200,
        'render returns graph': (r) => r.json('nodes') !== undefined,
      });

      if (!renderOk) flowSuccess = false;

      graphRenderDuration.add(Date.now() - renderStart);
    });

    sleep(0.5);

    // Step 4: Export
    group('4. Export Data', function () {
      const exportStart = Date.now();
      const exportRes = http.post(`${API_URL}/export`, JSON.stringify({
        format: 'json',
        entityIds: ['ent_001', 'ent_002'],
        includeProvenance: true,
      }), {
        headers,
        tags: { type: 'api', endpoint: 'export' },
      });

      const exportOk = check(exportRes, {
        'export status is 200': (r) => r.status === 200,
        'export returns data': (r) => r.body.length > 0,
        'export includes provenance': (r) => {
          try {
            const data = JSON.parse(r.body);
            return data.provenance !== undefined;
          } catch {
            return false;
          }
        },
      });

      if (!exportOk) flowSuccess = false;

      exportDuration.add(Date.now() - exportStart);
    });
  });

  // Record overall flow success
  if (flowSuccess) {
    goldenFlowSuccess.add(1);
  }
  goldenFlowSuccessRate.add(flowSuccess);

  sleep(1);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'k6-golden-flow-results.json': JSON.stringify(data),
    'k6-golden-flow-results.html': htmlReport(data),
  };
}

function textSummary(data, options) {
  const indent = options.indent || '';
  let summary = `${indent}Golden Flow Test Summary\n`;
  summary += `${indent}========================\n\n`;

  if (data.metrics.golden_flow_total) {
    summary += `${indent}Total Flows: ${data.metrics.golden_flow_total.values.count}\n`;
  }
  if (data.metrics.golden_flow_success_total) {
    summary += `${indent}Successful Flows: ${data.metrics.golden_flow_success_total.values.count}\n`;
  }
  if (data.metrics.golden_flow_success) {
    summary += `${indent}Success Rate: ${(data.metrics.golden_flow_success.values.rate * 100).toFixed(2)}%\n`;
  }

  summary += `\n${indent}Latency Metrics (p95):\n`;
  if (data.metrics.login_duration) {
    summary += `${indent}  Login: ${data.metrics.login_duration.values['p(95)'].toFixed(0)}ms\n`;
  }
  if (data.metrics.query_duration) {
    summary += `${indent}  Query: ${data.metrics.query_duration.values['p(95)'].toFixed(0)}ms\n`;
  }
  if (data.metrics.graph_render_duration) {
    summary += `${indent}  Graph Render: ${data.metrics.graph_render_duration.values['p(95)'].toFixed(0)}ms\n`;
  }
  if (data.metrics.export_duration) {
    summary += `${indent}  Export: ${data.metrics.export_duration.values['p(95)'].toFixed(0)}ms\n`;
  }

  return summary;
}

function htmlReport(data) {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>k6 Golden Flow Test Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    h1 { color: #333; }
    table { border-collapse: collapse; width: 100%; margin-top: 20px; }
    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
    th { background-color: #4CAF50; color: white; }
    .pass { color: green; font-weight: bold; }
    .fail { color: red; font-weight: bold; }
  </style>
</head>
<body>
  <h1>Golden Flow Test Report</h1>
  <p>Generated: ${new Date().toISOString()}</p>

  <h2>Summary</h2>
  <table>
    <tr><th>Metric</th><th>Value</th><th>Status</th></tr>
    <tr>
      <td>Success Rate</td>
      <td>${data.metrics.golden_flow_success ? (data.metrics.golden_flow_success.values.rate * 100).toFixed(2) : 'N/A'}%</td>
      <td class="${(data.metrics.golden_flow_success?.values.rate || 0) > 0.99 ? 'pass' : 'fail'}">
        ${(data.metrics.golden_flow_success?.values.rate || 0) > 0.99 ? 'PASS' : 'FAIL'}
      </td>
    </tr>
  </table>

  <h2>Latency (p95)</h2>
  <table>
    <tr><th>Step</th><th>Latency (ms)</th><th>Threshold</th><th>Status</th></tr>
    <tr>
      <td>Login</td>
      <td>${data.metrics.login_duration?.values['p(95)']?.toFixed(0) || 'N/A'}</td>
      <td>&lt; 2000ms</td>
      <td class="${(data.metrics.login_duration?.values['p(95)'] || 0) < 2000 ? 'pass' : 'fail'}">
        ${(data.metrics.login_duration?.values['p(95)'] || 0) < 2000 ? 'PASS' : 'FAIL'}
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}
