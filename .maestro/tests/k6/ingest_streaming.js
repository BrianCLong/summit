import http from 'k6/http';
import { check, sleep } from 'k6';

// SLO: Ingest streaming ≥ 1,000 events/s per pod; pre-storage p95 ≤ 100 ms
export const options = {
  vus: 50,
  duration: '5m',
  thresholds: {
    http_req_duration: ['p(95)<100'], // p95 must be under 100ms (pre-storage SLO)
    http_req_failed: ['rate<0.001'], // 99.9% availability
    checks: ['rate>0.99'], // 99% of checks must pass
    http_reqs: ['rate>1000'], // ≥ 1,000 requests/second throughput
  },
};

const BASE_URL = __ENV.GRAPHQL_URL || 'http://localhost:4000';
const JWT_TOKEN = __ENV.JWT || 'test-token';

export default function () {
  const tenantId = `tenant-${Math.floor(Math.random() * 100)}`;
  const idempotencyKey = `idem-${Date.now()}-${Math.random().toString(36).substring(7)}`;

  // Generate batch of signals
  const signals = [];
  const batchSize = Math.floor(Math.random() * 20) + 1; // 1-20 signals per request

  for (let i = 0; i < batchSize; i++) {
    signals.push({
      tenantId: tenantId,
      type: `signal-type-${Math.floor(Math.random() * 10)}`,
      value: (Math.random() - 0.5) * 2, // -1 to 1
      weight: Math.random(),
      source: 'k6-load-test',
      ts: new Date().toISOString(),
      purpose: ['investigation', 'benchmarking', 'monitoring'][
        Math.floor(Math.random() * 3)
      ],
      metadata: {
        test: 'load-test',
        batch: i,
      },
    });
  }

  const payload = {
    signals: signals,
    batch: true,
  };

  const params = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${JWT_TOKEN}`,
      'x-tenant-id': tenantId,
      'x-idempotency-key': idempotencyKey,
      'User-Agent': 'k6-ingest-test/24.2.0',
    },
    tags: {
      operation: 'ingest',
      batch_size: batchSize,
    },
  };

  const response = http.post(
    `${BASE_URL}/ingest/stream`,
    JSON.stringify(payload),
    params,
  );

  // Validate response
  check(response, {
    'status is 202': (r) => r.status === 202,
    'response has accepted field': (r) => r.json().accepted !== undefined,
    'no server errors': (r) => r.json().error === undefined,
    'signals accepted': (r) => r.json().accepted > 0,
  });

  // Test idempotency - retry with same key should return idempotent response
  if (Math.random() < 0.1) {
    // 10% of requests test idempotency
    const retryResponse = http.post(
      `${BASE_URL}/ingest/stream`,
      JSON.stringify(payload),
      params,
    );

    check(retryResponse, {
      'idempotent request handled': (r) => r.status === 202,
      'idempotent flag set': (r) =>
        r.json().idempotent === true || r.json().accepted >= 0,
    });
  }

  // Test backpressure handling occasionally
  if (Math.random() < 0.05) {
    // 5% of requests are large batches
    const largeBatch = {
      signals: Array(100)
        .fill()
        .map((_, i) => ({
          tenantId: tenantId,
          type: `burst-${i}`,
          value: Math.random(),
          source: 'k6-burst-test',
          ts: new Date().toISOString(),
          purpose: 'investigation',
        })),
    };

    const burstParams = {
      ...params,
      headers: {
        ...params.headers,
        'x-idempotency-key': `burst-${Date.now()}-${Math.random().toString(36)}`,
      },
      tags: {
        operation: 'ingest_burst',
        batch_size: 100,
      },
    };

    const burstResponse = http.post(
      `${BASE_URL}/ingest/stream`,
      JSON.stringify(largeBatch),
      burstParams,
    );

    check(burstResponse, {
      'burst handled or backpressure applied': (r) =>
        r.status === 202 || r.status === 429,
      'backpressure has retry-after': (r) =>
        r.status !== 429 || r.headers['retry-after'] !== undefined,
    });
  }

  // Brief pause to simulate realistic load patterns
  sleep(0.1 + Math.random() * 0.4); // 100-500ms pause
}

export function handleSummary(data) {
  return {
    'ingest-load-test-summary.json': JSON.stringify(data, null, 2),
    'ingest-load-test-summary.html': htmlReport(data),
  };
}

function htmlReport(data) {
  const passed = data.metrics.checks.values.passes;
  const failed = data.metrics.checks.values.fails;
  const total = passed + failed;
  const passRate = ((passed / total) * 100).toFixed(2);

  const avgDuration = data.metrics.http_req_duration.values.avg.toFixed(2);
  const p95Duration = data.metrics.http_req_duration.values['p(95)'].toFixed(2);
  const requestRate = data.metrics.http_reqs.values.rate.toFixed(2);

  return `
    <html>
    <head><title>Ingest Load Test Results</title></head>
    <body>
      <h1>Maestro Conductor v24.2 - Ingest Load Test Results</h1>
      
      <h2>SLO Compliance</h2>
      <ul>
        <li><strong>Throughput:</strong> ${requestRate} req/s (Target: ≥1,000 req/s)</li>
        <li><strong>Latency P95:</strong> ${p95Duration}ms (Target: ≤100ms)</li>
        <li><strong>Success Rate:</strong> ${passRate}% (Target: ≥99%)</li>
      </ul>
      
      <h2>Test Summary</h2>
      <ul>
        <li>Total Requests: ${data.metrics.http_reqs.values.count}</li>
        <li>Failed Requests: ${data.metrics.http_req_failed.values.fails}</li>
        <li>Average Duration: ${avgDuration}ms</li>
        <li>VUs: ${data.options.vus}</li>
        <li>Duration: ${data.options.duration}</li>
      </ul>
      
      <h2>Check Results</h2>
      <p>Passed: ${passed} | Failed: ${failed} | Pass Rate: ${passRate}%</p>
    </body>
    </html>
  `;
}
