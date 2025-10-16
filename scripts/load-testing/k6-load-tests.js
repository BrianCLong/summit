// IntelGraph Maestro Load Testing Suite
// Comprehensive load testing scenarios for production validation

import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep, group } from 'k6';
import { Rate, Counter, Trend, Gauge } from 'k6/metrics';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';

// Custom metrics
const workflowSuccessRate = new Rate('workflow_success_rate');
const workflowLatency = new Trend('workflow_execution_latency');
const apiErrorRate = new Rate('api_error_rate');
const concurrentUsers = new Gauge('concurrent_users');
const queueDepth = new Gauge('queue_depth');
const orchestrationThroughput = new Counter('orchestration_requests_total');

// Load test configuration
const config = {
  base_url: __ENV.TARGET_URL || 'http://localhost:5000',
  auth_token: __ENV.AUTH_TOKEN || 'test-token',
  namespace: __ENV.K8S_NAMESPACE || 'intelgraph-prod',
  test_duration: __ENV.TEST_DURATION || '10m',
  ramp_up_duration: __ENV.RAMP_UP || '2m',
  ramp_down_duration: __ENV.RAMP_DOWN || '1m',
};

// Test scenarios configuration
export let options = {
  scenarios: {
    // Baseline load test - normal production traffic simulation
    baseline_load: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: config.ramp_up_duration, target: 50 }, // Ramp up to 50 users
        { duration: config.test_duration, target: 50 }, // Stay at 50 users
        { duration: config.ramp_down_duration, target: 0 }, // Ramp down
      ],
      gracefulRampDown: '30s',
      tags: { test_type: 'baseline' },
    },

    // Peak load test - expected peak traffic
    peak_load: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '3m', target: 100 }, // Ramp to peak
        { duration: '5m', target: 100 }, // Stay at peak
        { duration: '2m', target: 0 }, // Ramp down
      ],
      startTime: '15m',
      gracefulRampDown: '30s',
      tags: { test_type: 'peak' },
    },

    // Stress test - beyond normal capacity
    stress_test: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '2m', target: 200 }, // Ramp to stress level
        { duration: '5m', target: 200 }, // Maintain stress
        { duration: '2m', target: 0 }, // Ramp down
      ],
      startTime: '25m',
      gracefulRampDown: '30s',
      tags: { test_type: 'stress' },
    },

    // Spike test - sudden traffic increase
    spike_test: {
      executor: 'ramping-vus',
      startVUs: 50,
      stages: [
        { duration: '30s', target: 300 }, // Sudden spike
        { duration: '1m', target: 300 }, // Hold spike
        { duration: '30s', target: 50 }, // Back to normal
      ],
      startTime: '35m',
      gracefulRampDown: '30s',
      tags: { test_type: 'spike' },
    },

    // Endurance test - long duration at moderate load
    endurance_test: {
      executor: 'constant-vus',
      vus: 75,
      duration: '30m',
      startTime: '45m',
      tags: { test_type: 'endurance' },
    },

    // Workflow-specific load test
    workflow_load: {
      executor: 'constant-arrival-rate',
      rate: 10, // 10 workflows per second
      timeUnit: '1s',
      duration: '10m',
      preAllocatedVUs: 20,
      maxVUs: 100,
      startTime: '80m',
      tags: { test_type: 'workflow' },
    },
  },

  // Global test thresholds
  thresholds: {
    http_req_duration: ['p(95)<5000'], // 95% of requests under 5s
    http_req_failed: ['rate<0.02'], // Error rate under 2%
    workflow_success_rate: ['rate>0.98'], // Workflow success rate over 98%
    workflow_execution_latency: ['p(95)<300000'], // 95% under 5 minutes
    checks: ['rate>0.95'], // 95% of checks should pass
  },

  // Test output configuration
  summaryTrendStats: [
    'avg',
    'min',
    'med',
    'max',
    'p(90)',
    'p(95)',
    'p(99)',
    'p(99.9)',
  ],

  // Graceful stop
  gracefulStop: '30s',
};

// Setup function - runs once before all VUs
export function setup() {
  console.log('🚀 Starting IntelGraph Maestro Load Tests');
  console.log(`Target URL: ${config.base_url}`);
  console.log(`Test Duration: ${config.test_duration}`);

  // Warm up the system
  console.log('🔥 Warming up system...');
  const warmupResponse = http.get(`${config.base_url}/health`);
  check(warmupResponse, {
    'warmup - system is healthy': (r) => r.status === 200,
  });

  return {
    baseUrl: config.base_url,
    authToken: config.auth_token,
  };
}

// Main test function - runs for each VU iteration
export default function (data) {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${data.authToken}`,
    'User-Agent': 'k6-load-test/1.0.0',
  };

  concurrentUsers.add(1);

  // Test scenario based on probability weights
  const scenario = Math.random();

  if (scenario < 0.4) {
    // 40% - Health checks and status endpoints
    healthCheckScenario(data.baseUrl, headers);
  } else if (scenario < 0.7) {
    // 30% - Workflow orchestration
    workflowOrchestrationScenario(data.baseUrl, headers);
  } else if (scenario < 0.85) {
    // 15% - Metrics and monitoring
    metricsScenario(data.baseUrl, headers);
  } else if (scenario < 0.95) {
    // 10% - Authentication and user management
    authScenario(data.baseUrl, headers);
  } else {
    // 5% - Complex end-to-end workflows
    e2eWorkflowScenario(data.baseUrl, headers);
  }

  // Random sleep between 1-5 seconds
  sleep(Math.random() * 4 + 1);
}

// Health check scenario
function healthCheckScenario(baseUrl, headers) {
  group('Health Checks', () => {
    const healthResponse = http.get(`${baseUrl}/health`, { headers });

    check(healthResponse, {
      'health check - status 200': (r) => r.status === 200,
      'health check - response time < 1s': (r) => r.timings.duration < 1000,
      'health check - healthy status': (r) => r.json().status === 'healthy',
    });

    apiErrorRate.add(healthResponse.status >= 400);

    // Also check specific component health
    const componentsResponse = http.get(`${baseUrl}/health/components`, {
      headers,
    });
    check(componentsResponse, {
      'components health - status 200': (r) => r.status === 200,
    });
  });
}

// Workflow orchestration scenario
function workflowOrchestrationScenario(baseUrl, headers) {
  group('Workflow Orchestration', () => {
    const startTime = Date.now();

    // Start workflow execution
    const workflowPayload = {
      query: `Load test query ${Date.now()} - ${Math.random()}`,
      context: {
        purpose: 'load_testing',
        urgency: 'medium',
        budgetLimit: 5.0,
        qualityThreshold: 0.7,
      },
    };

    const orchestrateResponse = http.post(
      `${baseUrl}/orchestrate`,
      JSON.stringify(workflowPayload),
      { headers, timeout: '30s' },
    );

    const orchestrateSuccess = check(orchestrateResponse, {
      'orchestrate - status 200': (r) => r.status === 200,
      'orchestrate - has orchestration ID': (r) =>
        r.json().data && r.json().data.orchestrationId,
      'orchestrate - response time < 30s': (r) => r.timings.duration < 30000,
    });

    orchestrationThroughput.add(1);
    apiErrorRate.add(orchestrateResponse.status >= 400);

    if (orchestrateSuccess && orchestrateResponse.json().data) {
      const orchestrationId = orchestrateResponse.json().data.orchestrationId;

      // Poll for workflow completion
      let completed = false;
      let attempts = 0;
      const maxAttempts = 10;

      while (!completed && attempts < maxAttempts) {
        sleep(2);
        attempts++;

        const statusResponse = http.get(
          `${baseUrl}/workflow/status/${orchestrationId}`,
          { headers },
        );

        if (statusResponse.status === 200) {
          const status = statusResponse.json().status;
          if (status === 'completed' || status === 'failed') {
            completed = true;
            const executionTime = Date.now() - startTime;
            workflowLatency.add(executionTime);
            workflowSuccessRate.add(status === 'completed');
          }
        }
      }
    }
  });
}

// Metrics scenario
function metricsScenario(baseUrl, headers) {
  group('Metrics and Monitoring', () => {
    // Get system metrics
    const metricsResponse = http.get(`${baseUrl}/metrics`, { headers });
    check(metricsResponse, {
      'metrics - status 200': (r) => r.status === 200,
      'metrics - has data': (r) => r.json().data !== undefined,
      'metrics - response time < 2s': (r) => r.timings.duration < 2000,
    });

    // Get workflow metrics
    const workflowMetricsResponse = http.get(`${baseUrl}/workflows/metrics`, {
      headers,
    });
    check(workflowMetricsResponse, {
      'workflow metrics - status 200': (r) => r.status === 200,
      'workflow metrics - has summary': (r) =>
        r.json().data && r.json().data.summary,
    });

    // Get model status
    const modelsResponse = http.get(`${baseUrl}/models`, { headers });
    check(modelsResponse, {
      'models - status 200': (r) => r.status === 200,
      'models - has models': (r) => r.json().data && r.json().data.length > 0,
    });

    apiErrorRate.add(metricsResponse.status >= 400);
    apiErrorRate.add(workflowMetricsResponse.status >= 400);
    apiErrorRate.add(modelsResponse.status >= 400);
  });
}

// Authentication scenario
function authScenario(baseUrl, headers) {
  group('Authentication', () => {
    // Get user info
    const userInfoResponse = http.get(`${baseUrl}/auth/user`, { headers });
    check(userInfoResponse, {
      'auth user info - status 200': (r) => r.status === 200,
      'auth user info - has user': (r) => r.json().user !== undefined,
    });

    // Get JWKS
    const jwksResponse = http.get(`${baseUrl}/auth/jwks`, { headers });
    check(jwksResponse, {
      'jwks - status 200': (r) => r.status === 200,
      'jwks - has keys': (r) => r.json().keys && r.json().keys.length > 0,
    });

    apiErrorRate.add(userInfoResponse.status >= 400);
    apiErrorRate.add(jwksResponse.status >= 400);
  });
}

// End-to-end workflow scenario
function e2eWorkflowScenario(baseUrl, headers) {
  group('E2E Workflow', () => {
    const startTime = Date.now();

    // Execute Hello World workflow
    const helloWorldResponse = http.post(
      `${baseUrl}/workflows/hello-world/execute`,
      '{}',
      { headers, timeout: '60s' },
    );

    const e2eSuccess = check(helloWorldResponse, {
      'e2e hello world - status 200': (r) => r.status === 200,
      'e2e hello world - has execution ID': (r) =>
        r.json().data && r.json().data.executionId,
    });

    if (e2eSuccess && helloWorldResponse.json().data) {
      const executionId = helloWorldResponse.json().data.executionId;

      // Monitor execution progress
      let completed = false;
      let attempts = 0;
      const maxAttempts = 30; // 1 minute timeout

      while (!completed && attempts < maxAttempts) {
        sleep(2);
        attempts++;

        const statusResponse = http.get(
          `${baseUrl}/executions/${executionId}`,
          { headers },
        );

        if (statusResponse.status === 200) {
          const execution = statusResponse.json().data;
          if (
            execution.status === 'completed' ||
            execution.status === 'failed'
          ) {
            completed = true;
            const executionTime = Date.now() - startTime;
            workflowLatency.add(executionTime);
            workflowSuccessRate.add(execution.status === 'completed');
          }
        }
      }
    }

    apiErrorRate.add(helloWorldResponse.status >= 400);
  });
}

// Teardown function - runs once after all VUs complete
export function teardown(data) {
  console.log('🏁 IntelGraph Maestro Load Tests Complete');

  // Final system health check
  const finalHealthResponse = http.get(`${data.baseUrl}/health`);
  console.log(`Final health status: ${finalHealthResponse.json().status}`);
}

// Custom summary function
export function handleSummary(data) {
  const summary = {
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
    'load-test-results.json': JSON.stringify(data),
    'load-test-summary.html': generateHtmlSummary(data),
  };

  return summary;
}

// Generate HTML summary report
function generateHtmlSummary(data) {
  const testResults = data.metrics;

  return `
<!DOCTYPE html>
<html>
<head>
    <title>IntelGraph Maestro Load Test Results</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { background: #f0f8ff; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .metric-card { background: white; border: 1px solid #ddd; border-radius: 8px; padding: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .metric-title { font-weight: bold; color: #333; margin-bottom: 10px; }
        .metric-value { font-size: 24px; color: #0066cc; margin-bottom: 5px; }
        .metric-threshold { font-size: 12px; color: #666; }
        .pass { color: #28a745; }
        .fail { color: #dc3545; }
        .summary-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        .summary-table th, .summary-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .summary-table th { background-color: #f8f9fa; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎯 IntelGraph Maestro Load Test Results</h1>
        <p><strong>Test Duration:</strong> ${Math.round(data.root_group.checks.length / 60)}m</p>
        <p><strong>Total Requests:</strong> ${testResults.http_reqs ? testResults.http_reqs.count : 'N/A'}</p>
        <p><strong>Error Rate:</strong> ${testResults.http_req_failed ? (testResults.http_req_failed.rate * 100).toFixed(2) + '%' : 'N/A'}</p>
    </div>
    
    <div class="metrics">
        <div class="metric-card">
            <div class="metric-title">Response Time (P95)</div>
            <div class="metric-value">${testResults.http_req_duration ? testResults.http_req_duration.p95.toFixed(0) + 'ms' : 'N/A'}</div>
            <div class="metric-threshold ${testResults.http_req_duration && testResults.http_req_duration.p95 < 5000 ? 'pass' : 'fail'}">
                Threshold: < 5000ms
            </div>
        </div>
        
        <div class="metric-card">
            <div class="metric-title">Workflow Success Rate</div>
            <div class="metric-value">${testResults.workflow_success_rate ? (testResults.workflow_success_rate.rate * 100).toFixed(2) + '%' : 'N/A'}</div>
            <div class="metric-threshold ${testResults.workflow_success_rate && testResults.workflow_success_rate.rate > 0.98 ? 'pass' : 'fail'}">
                Threshold: > 98%
            </div>
        </div>
        
        <div class="metric-card">
            <div class="metric-title">Workflow Latency (P95)</div>
            <div class="metric-value">${testResults.workflow_execution_latency ? (testResults.workflow_execution_latency.p95 / 1000).toFixed(1) + 's' : 'N/A'}</div>
            <div class="metric-threshold ${testResults.workflow_execution_latency && testResults.workflow_execution_latency.p95 < 300000 ? 'pass' : 'fail'}">
                Threshold: < 300s
            </div>
        </div>
        
        <div class="metric-card">
            <div class="metric-title">Orchestration Throughput</div>
            <div class="metric-value">${testResults.orchestration_requests_total ? testResults.orchestration_requests_total.count : 'N/A'}</div>
            <div class="metric-threshold">Total orchestration requests</div>
        </div>
    </div>
    
    <h2>📊 Detailed Metrics</h2>
    <table class="summary-table">
        <tr><th>Metric</th><th>Count</th><th>Rate</th><th>Avg</th><th>P95</th><th>Max</th></tr>
        ${Object.entries(testResults)
          .map(
            ([name, metric]) => `
            <tr>
                <td>${name}</td>
                <td>${metric.count || 'N/A'}</td>
                <td>${metric.rate ? (metric.rate * 100).toFixed(2) + '%' : 'N/A'}</td>
                <td>${metric.avg ? metric.avg.toFixed(2) : 'N/A'}</td>
                <td>${metric.p95 ? metric.p95.toFixed(2) : 'N/A'}</td>
                <td>${metric.max ? metric.max.toFixed(2) : 'N/A'}</td>
            </tr>
        `,
          )
          .join('')}
    </table>
    
    <p><em>Generated on ${new Date().toISOString()}</em></p>
</body>
</html>`;
}
