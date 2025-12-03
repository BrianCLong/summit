
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// ----------------------------------------------------------------------------
// METRICS
// ----------------------------------------------------------------------------
const leakage_attempts = new Counter('stress_leakage_attempts');
const leakage_failures = new Rate('stress_leakage_failures'); // Detected leaks (Should be 0 for secure system)
const access_denied_rate = new Rate('stress_access_denied_rate'); // Should be 100% for cross-tenant
const request_duration = new Trend('stress_req_duration');

// ----------------------------------------------------------------------------
// CONFIGURATION
// ----------------------------------------------------------------------------
export const options = {
  scenarios: {
    aggressive_cross_tenant: {
      executor: 'ramping-arrival-rate',
      startRate: 50,
      timeUnit: '1s',
      preAllocatedVUs: 50,
      maxVUs: 100,
      stages: [
        { target: 100, duration: '30s' }, // Ramp up to 100 req/s
        { target: 100, duration: '1m' },  // Sustain
        { target: 0, duration: '10s' },   // Ramp down
      ],
    },
  },
  thresholds: {
    'stress_leakage_failures': ['rate==0'], // FAIL if any leak is detected
    'stress_access_denied_rate': ['rate>0.99'], // Expect >99% denied for cross-tenant traffic
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';

// ----------------------------------------------------------------------------
// MOCK DATA (In a real scenario, these would be valid tokens)
// ----------------------------------------------------------------------------
// Since we are black-box testing the deployed env, we assume we have valid tokens.
// If running against localhost dev, we might use "dev-token" or similar if supported.
// Here we simulate the payloads.

const QUERY_ENTITY = `
query GetEntity($id: String!) {
  entity(id: $id) {
    id
    props
  }
}
`;

// Victim Resource ID (Tenant B)
const VICTIM_RESOURCE_ID = 'doc-b';

// ----------------------------------------------------------------------------
// TEST FUNCTION
// ----------------------------------------------------------------------------
export default function () {
  // Scenario: Attacker (Tenant A) trying to access Tenant B resource
  // We simulate this by sending a request authenticated as Tenant A
  // but requesting VICTIM_RESOURCE_ID.

  // Headers for Tenant A
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer attacker-token-tenant-a', // Mock token
  };

  group('Cross-Tenant Access Attempt', () => {
    const payload = JSON.stringify({
      query: QUERY_ENTITY,
      variables: { id: VICTIM_RESOURCE_ID },
    });

    const res = http.post(`${BASE_URL}/graphql`, payload, { headers });

    leakage_attempts.add(1);
    request_duration.add(res.timings.duration);

    // CHECK: Did we get the data?
    // Secure behavior:
    // 1. HTTP 200 with data: null, errors: ["Forbidden" or "Missing tenant context"]
    // 2. HTTP 403
    // Vulnerable behavior:
    // 1. HTTP 200 with data containing the entity

    const isLeak =
      res.status === 200 &&
      res.json('data.entity.id') === VICTIM_RESOURCE_ID;

    check(res, {
      'is not a leak': () => !isLeak,
      'access denied': (r) => {
        if (r.status === 403) return true;
        if (r.status === 200 && r.body && (r.body.includes('Forbidden') || r.body.includes('Access denied') || r.json('data.entity') === null)) return true;
        return false;
      }
    });

    if (isLeak) {
        leakage_failures.add(1);
    }

    // Update metrics
    if (res.status === 403 || (res.body && res.body.includes('Forbidden'))) {
        access_denied_rate.add(1);
    } else if (res.json('data.entity') === null) {
        access_denied_rate.add(1);
    } else {
        access_denied_rate.add(0);
    }
  });

  sleep(0.1);
}
