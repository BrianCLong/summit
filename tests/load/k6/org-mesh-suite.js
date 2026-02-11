import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  thresholds: {
    'http_req_duration': ['p(95)<2000'], // p95 latency < 2s
    'http_req_failed': ['rate<0.005'],    // Error rate < 0.5%
  },
  scenarios: {
    ingest_task: {
      executor: 'ramping-vus',
      exec: 'ingest',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 25 },
        { duration: '5m', target: 125 }, // Ramp up to peak
        { duration: '10m', target: 125 }, // SUSTAINED PEAK
        { duration: '2m', target: 0 },
      ],
      gracefulStop: '30s',
    },
    drift_task: {
      executor: 'ramping-vus',
      exec: 'drift',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 25 },
        { duration: '5m', target: 125 }, // Ramp up to peak
        { duration: '10m', target: 125 }, // SUSTAINED PEAK
        { duration: '2m', target: 0 },
      ],
      gracefulStop: '30s',
    },
    narrative_task: {
      executor: 'ramping-vus',
      exec: 'narrative',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 25 },
        { duration: '5m', target: 125 }, // Ramp up to peak
        { duration: '10m', target: 125 }, // SUSTAINED PEAK
        { duration: '2m', target: 0 },
      ],
      gracefulStop: '30s',
    },
    multi_tenant_task: {
      executor: 'ramping-vus',
      exec: 'multiTenant',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 25 },
        { duration: '5m', target: 125 }, // Ramp up to peak
        { duration: '10m', target: 125 }, // SUSTAINED PEAK
        { duration: '2m', target: 0 },
      ],
      gracefulStop: '30s',
    },
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

const params = {
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ga-capacity-token',
  },
};

export default function() {
  sleep(1);
}

export function ingest() {
  const payload = JSON.stringify({
    org: 'acme',
    mode: 'ingest',
    data: {
      source: 'prod-mesh-sensor-01',
      entities: [
        { id: `ent-${Math.random()}`, type: 'Service', metadata: { zone: 'us-east-1', critical: true } },
        { id: `ent-${Math.random()}`, type: 'Database', metadata: { tier: 'storage', cluster: 'main' } }
      ],
      relationships: [
        { source: 'svc-01', target: 'db-01', type: 'DEPENDS_ON' }
      ]
    },
    timestamp: new Date().toISOString()
  });
  const res = http.post(`${BASE_URL}/api/org-mesh/scan`, payload, params);
  check(res, {
    'ingest status 200': (r) => r.status === 200,
  });
  sleep(1);
}

export function drift() {
  const payload = JSON.stringify({
    org: 'acme',
    analysis: {
      baseline_id: 'baseline-2026-01',
      current_snapshot: `snap-${Date.now()}`,
      sensitivity: 0.85
    },
    timestamp: new Date().toISOString()
  });
  const res = http.post(`${BASE_URL}/api/org-mesh/drift`, payload, params);
  check(res, {
    'drift status 200': (r) => r.status === 200,
  });
  sleep(1);
}

export function narrative() {
  const payload = JSON.stringify({
    org: 'acme',
    context: {
      domain: 'financial-services',
      summary_length: 'detailed',
      include_provenance: true
    },
    timestamp: new Date().toISOString()
  });
  const res = http.post(`${BASE_URL}/api/org-mesh/narrative`, payload, params);
  check(res, {
    'narrative status 200': (r) => r.status === 200,
  });
  sleep(1);
}

export function multiTenant() {
  const tenantId = `tenant-${Math.floor(Math.random() * 100)}`;
  const payload = JSON.stringify({
    org: tenantId,
    mode: 'scan',
    config: {
      depth: 3,
      timeout_ms: 5000
    },
    timestamp: new Date().toISOString()
  });
  const res = http.post(`${BASE_URL}/api/org-mesh/scan`, payload, params);
  check(res, {
    'multi-tenant status 200': (r) => r.status === 200,
  });
  sleep(1);
}
