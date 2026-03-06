import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const ingest_duration = new Trend('ingest_duration');
const drift_scan_duration = new Trend('drift_scan_duration');
const narrative_detect_duration = new Trend('narrative_detect_duration');
const error_rate = new Rate('error_rate');

export const options = {
  scenarios: {
    org_mesh_scale: {
      executor: 'ramping-vus',
      startVUs: 10,
      stages: [
        { duration: '1m', target: 100 },
        { duration: '2m', target: 500 },
        { duration: '1m', target: 10 },
      ],
      gracefulStop: '30s',
    },
  },
  thresholds: {
    'http_req_duration': ['p(95)<2000'], // p95 < 2s
    'error_rate': ['rate<0.01'],        // error < 1%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';

export default function () {
  // Simulate 100 different tenants
  const tenantId = `tenant-${Math.floor(Math.random() * 100)}`;
  const headers = {
    'Content-Type': 'application/json',
    'X-Tenant-Id': tenantId,
    'Authorization': `Bearer mock-token-${tenantId}`,
  };

  group('Tenant Operations', () => {
    // 1. Data Ingestion
    group('Data Ingest', () => {
      const payload = JSON.stringify({
        source: 'OSINT-Collector',
        payload: {
          timestamp: new Date().toISOString(),
          signals: [
            { id: 'sig-1', type: 'narrative', value: 'OSINT Summit 2026' },
            { id: 'sig-2', type: 'drift', value: 0.45 }
          ]
        }
      });
      const res = http.post(`${BASE_URL}/api/v1/ingest`, payload, { headers });

      const success = check(res, {
        'ingest status is 202': (r) => r.status === 202 || r.status === 200,
      });

      if (!success) error_rate.add(1);
      ingest_duration.add(res.timings.duration);
    });

    sleep(0.5);

    // 2. Drift Scan
    group('Drift Scan', () => {
      const res = http.get(`${BASE_URL}/api/v1/drift/scan?full=true`, { headers });

      const success = check(res, {
        'drift scan status is 200': (r) => r.status === 200,
      });

      if (!success) error_rate.add(1);
      drift_scan_duration.add(res.timings.duration);
    });

    sleep(0.5);

    // 3. Narrative Detection
    group('Narrative Detect', () => {
      const res = http.get(`${BASE_URL}/api/v1/narratives/detect`, { headers });

      const success = check(res, {
        'narrative detect status is 200': (r) => r.status === 200,
      });

      if (!success) error_rate.add(1);
      narrative_detect_duration.add(res.timings.duration);
    });
  });

  sleep(Math.random() * 2 + 1); // Realistic pacing
}
