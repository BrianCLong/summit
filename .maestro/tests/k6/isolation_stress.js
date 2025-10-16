import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Counter, Trend } from 'k6/metrics';

// SLO: 0 cross-tenant data leakage under 10x normal load
export const options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up
    { duration: '5m', target: 500 }, // 10x normal load
    { duration: '2m', target: 1000 }, // Stress spike
    { duration: '1m', target: 1000 }, // Sustain stress
    { duration: '2m', target: 0 }, // Ramp down
  ],
  thresholds: {
    isolation_violations: ['rate==0'], // 0% isolation violations
    cross_tenant_leaks: ['count==0'], // 0 cross-tenant leaks
    http_req_duration: ['p(95)<1000'], // p95 under stress
    http_req_failed: ['rate<0.01'], // 99% availability under stress
    checks: ['rate>0.99'], // 99% checks pass
  },
};

// Custom metrics for isolation monitoring
const isolationViolations = new Rate('isolation_violations');
const crossTenantLeaks = new Counter('cross_tenant_leaks');
const tenantBoundaryChecks = new Counter('tenant_boundary_checks');
const concurrentTenantOps = new Trend('concurrent_tenant_operations');

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';
const GRAPHQL_URL = __ENV.GRAPHQL_URL || `${BASE_URL}/graphql`;
const JWT_TOKEN = __ENV.JWT || 'test-token';

// Test tenants with known data
const TEST_TENANTS = [
  { id: 'isolation-victim-001', secrets: ['victim-key-1', 'victim-key-2'] },
  { id: 'isolation-victim-002', secrets: ['victim-key-3', 'victim-key-4'] },
  { id: 'isolation-attacker-001', secrets: ['attacker-key-1'] },
  { id: 'isolation-attacker-002', secrets: ['attacker-key-2'] },
];

export function setup() {
  console.log('Setting up isolation stress test data...');

  // Seed test data for each tenant
  TEST_TENANTS.forEach((tenant) => {
    // Create signals for each tenant
    const signals = Array.from({ length: 50 }, (_, i) => ({
      tenantId: tenant.id,
      type: `test-signal-${i}`,
      value: Math.random() * 2 - 1,
      source: 'isolation-stress-test',
      ts: new Date().toISOString(),
      purpose: 'investigation',
      metadata: { tenant: tenant.id, index: i },
    }));

    const payload = { signals, batch: true };
    const params = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${JWT_TOKEN}`,
        'x-tenant-id': tenant.id,
        'x-idempotency-key': `setup-${tenant.id}-${Date.now()}`,
      },
    };

    const response = http.post(
      `${BASE_URL}/ingest/stream`,
      JSON.stringify(payload),
      params,
    );
    check(response, {
      'setup data ingested': (r) => r.status === 202,
    });
  });

  return { tenants: TEST_TENANTS };
}

export default function (data) {
  const tenant = data.tenants[Math.floor(Math.random() * data.tenants.length)];
  const currentVU = __VU;
  const currentIter = __ITER;

  group('Multi-Tenant Isolation Stress Test', function () {
    // Test 1: Concurrent tenant data access
    group('Concurrent Tenant Access', function () {
      const startTime = new Date();

      // Select a different tenant to attempt cross-access
      const otherTenant = data.tenants.find((t) => t.id !== tenant.id);

      const responses = http.batch([
        // Legitimate tenant access
        {
          method: 'POST',
          url: GRAPHQL_URL,
          body: JSON.stringify({
            query: `
              query GetSignals($tenantId: String!) {
                signals(tenantId: $tenantId, limit: 10) {
                  id
                  tenantId
                  type
                  value
                }
              }
            `,
            variables: { tenantId: tenant.id },
          }),
          params: {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${JWT_TOKEN}`,
              'x-tenant-id': tenant.id,
            },
            tags: { tenant: tenant.id, operation: 'legitimate_access' },
          },
        },

        // Attempted cross-tenant access (should be blocked)
        {
          method: 'POST',
          url: GRAPHQL_URL,
          body: JSON.stringify({
            query: `
              query GetSignals($tenantId: String!) {
                signals(tenantId: $tenantId, limit: 10) {
                  id
                  tenantId
                  type
                  value
                }
              }
            `,
            variables: { tenantId: otherTenant.id },
          }),
          params: {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${JWT_TOKEN}`,
              'x-tenant-id': tenant.id, // Wrong tenant context
            },
            tags: { tenant: tenant.id, operation: 'cross_tenant_attempt' },
          },
        },
      ]);

      const [legitimateResponse, crossTenantResponse] = responses;

      // Verify legitimate access works
      const legitimateCheck = check(legitimateResponse, {
        'legitimate access succeeds': (r) => r.status === 200,
        'legitimate data returned': (r) => {
          const data = r.json();
          return data.data && data.data.signals && data.data.signals.length > 0;
        },
        'legitimate data is own tenant': (r) => {
          const data = r.json();
          if (data.data && data.data.signals) {
            return data.data.signals.every(
              (signal) => signal.tenantId === tenant.id,
            );
          }
          return true;
        },
      });

      // Verify cross-tenant access is blocked
      const crossTenantBlocked = check(crossTenantResponse, {
        'cross-tenant blocked or empty': (r) => {
          if (r.status !== 200) return true; // Access denied
          const data = r.json();
          if (data.errors) return true; // GraphQL error
          if (data.data && data.data.signals) {
            // If data returned, it should NOT contain other tenant's data
            const hasOtherTenantData = data.data.signals.some(
              (signal) => signal.tenantId === otherTenant.id,
            );
            return !hasOtherTenantData;
          }
          return true; // No data returned
        },
      });

      tenantBoundaryChecks.add(2);

      if (!crossTenantBlocked) {
        isolationViolations.add(1);
        crossTenantLeaks.add(1);
        console.error(
          `ISOLATION VIOLATION: VU${currentVU} iter${currentIter} - Tenant ${tenant.id} accessed ${otherTenant.id} data`,
        );
      } else {
        isolationViolations.add(0);
      }

      const opDuration = new Date() - startTime;
      concurrentTenantOps.add(opDuration);
    });

    // Test 2: Rapid tenant switching
    group('Rapid Tenant Switching', function () {
      const rapidSwitches = [];

      for (let i = 0; i < 5; i++) {
        const switchTenant = data.tenants[i % data.tenants.length];

        rapidSwitches.push({
          method: 'POST',
          url: `${BASE_URL}/ingest/stream`,
          body: JSON.stringify({
            signals: [
              {
                tenantId: switchTenant.id,
                type: `rapid-switch-${i}`,
                value: Math.random(),
                source: 'isolation-stress',
                ts: new Date().toISOString(),
                purpose: 'investigation',
              },
            ],
          }),
          params: {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${JWT_TOKEN}`,
              'x-tenant-id': switchTenant.id,
              'x-idempotency-key': `rapid-${currentVU}-${currentIter}-${i}-${Date.now()}`,
            },
            tags: { tenant: switchTenant.id, operation: 'rapid_ingest' },
          },
        });
      }

      const rapidResponses = http.batch(rapidSwitches);

      rapidResponses.forEach((response, i) => {
        const expectedTenant = data.tenants[i % data.tenants.length];

        check(
          response,
          {
            'rapid switch accepted': (r) => r.status === 202,
            'rapid switch isolated': (r) => {
              const data = r.json();
              // Check that response doesn't leak other tenant info
              if (data.tenant && data.tenant !== expectedTenant.id) {
                isolationViolations.add(1);
                crossTenantLeaks.add(1);
                return false;
              }
              return true;
            },
          },
          { tenant: expectedTenant.id },
        );
      });
    });

    // Test 3: Concurrent operations on same tenant
    group('Same Tenant Concurrency', function () {
      const concurrentOps = Array.from({ length: 3 }, (_, i) => ({
        method: 'POST',
        url: GRAPHQL_URL,
        body: JSON.stringify({
          query: `
            query GetTenantStats($tenantId: String!) {
              signals(tenantId: $tenantId, limit: 5) {
                id
                tenantId
              }
            }
          `,
          variables: { tenantId: tenant.id },
        }),
        params: {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${JWT_TOKEN}`,
            'x-tenant-id': tenant.id,
          },
          tags: { tenant: tenant.id, operation: `concurrent_${i}` },
        },
      }));

      const concurrentResponses = http.batch(concurrentOps);

      concurrentResponses.forEach((response, i) => {
        check(
          response,
          {
            'concurrent op succeeds': (r) => r.status === 200,
            'concurrent op isolated': (r) => {
              const data = r.json();
              if (data.data && data.data.signals) {
                const hasWrongTenant = data.data.signals.some(
                  (signal) => signal.tenantId !== tenant.id,
                );
                if (hasWrongTenant) {
                  isolationViolations.add(1);
                  crossTenantLeaks.add(1);
                  return false;
                }
              }
              return true;
            },
          },
          { tenant: tenant.id, concurrent_op: i },
        );
      });
    });

    // Test 4: Memory pressure with large queries
    if (Math.random() < 0.1) {
      // 10% of requests create memory pressure
      group('Memory Pressure Test', function () {
        const largeQuery = {
          method: 'POST',
          url: GRAPHQL_URL,
          body: JSON.stringify({
            query: `
              query GetManySignals($tenantId: String!) {
                signals(tenantId: $tenantId, limit: 100) {
                  id
                  tenantId
                  type
                  value
                  metadata
                }
              }
            `,
            variables: { tenantId: tenant.id },
          }),
          params: {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${JWT_TOKEN}`,
              'x-tenant-id': tenant.id,
            },
            tags: { tenant: tenant.id, operation: 'memory_pressure' },
          },
        };

        const response = http.request(
          largeQuery.method,
          largeQuery.url,
          largeQuery.body,
          largeQuery.params,
        );

        check(response, {
          'memory pressure handled': (r) => r.status === 200,
          'memory pressure isolated': (r) => {
            const data = r.json();
            if (data.data && data.data.signals) {
              const hasWrongTenant = data.data.signals.some(
                (signal) => signal.tenantId !== tenant.id,
              );
              if (hasWrongTenant) {
                isolationViolations.add(1);
                crossTenantLeaks.add(1);
                console.error(
                  `MEMORY CORRUPTION: Tenant ${tenant.id} saw other tenant data under memory pressure`,
                );
                return false;
              }
            }
            return true;
          },
        });
      });
    }
  });

  // Brief pause to simulate realistic usage
  sleep(0.1 + Math.random() * 0.2);
}

export function teardown(data) {
  console.log('Cleaning up isolation stress test...');

  // Note: In a real scenario, you might want to clean up test data
  // For now, we'll let the retention policies handle it
}

export function handleSummary(data) {
  const isolationViolationRate =
    data.metrics.isolation_violations?.values?.rate || 0;
  const crossTenantLeakCount =
    data.metrics.cross_tenant_leaks?.values?.count || 0;
  const totalChecks = data.metrics.tenant_boundary_checks?.values?.count || 0;

  const passed = data.metrics.checks.values.passes;
  const failed = data.metrics.checks.values.fails;
  const total = passed + failed;
  const passRate = ((passed / total) * 100).toFixed(2);

  const avgDuration = data.metrics.http_req_duration.values.avg.toFixed(2);
  const p95Duration = data.metrics.http_req_duration.values['p(95)'].toFixed(2);

  const report = {
    'isolation-stress-summary.json': JSON.stringify(data, null, 2),
    'isolation-stress-report.html': `
      <html>
      <head><title>Multi-Tenant Isolation Stress Test Results</title></head>
      <body>
        <h1>Maestro Conductor v24.2 - Isolation Stress Test Results</h1>
        
        <h2>🔒 Isolation Metrics</h2>
        <ul>
          <li><strong>Isolation Violations:</strong> ${(isolationViolationRate * 100).toFixed(4)}% (Target: 0%)</li>
          <li><strong>Cross-Tenant Leaks:</strong> ${crossTenantLeakCount} (Target: 0)</li>
          <li><strong>Tenant Boundary Checks:</strong> ${totalChecks}</li>
          <li><strong>Overall Pass Rate:</strong> ${passRate}% (Target: ≥99%)</li>
        </ul>
        
        <h2>⚡ Performance Under Stress</h2>
        <ul>
          <li><strong>Average Latency:</strong> ${avgDuration}ms</li>
          <li><strong>P95 Latency:</strong> ${p95Duration}ms (Target: ≤1000ms under stress)</li>
          <li><strong>Total Requests:</strong> ${data.metrics.http_reqs.values.count}</li>
          <li><strong>Failed Requests:</strong> ${data.metrics.http_req_failed.values.fails}</li>
        </ul>
        
        <h2>🎯 SLO Compliance</h2>
        <ul>
          <li><strong>Zero Cross-Tenant Leaks:</strong> ${crossTenantLeakCount === 0 ? '✅ PASS' : '❌ FAIL'}</li>
          <li><strong>Zero Isolation Violations:</strong> ${isolationViolationRate === 0 ? '✅ PASS' : '❌ FAIL'}</li>
          <li><strong>Stress Performance:</strong> ${p95Duration < 1000 ? '✅ PASS' : '❌ FAIL'}</li>
          <li><strong>Availability:</strong> ${data.metrics.http_req_failed.values.rate < 0.01 ? '✅ PASS' : '❌ FAIL'}</li>
        </ul>
        
        <h2>📊 Test Configuration</h2>
        <ul>
          <li><strong>Peak VUs:</strong> 1000</li>
          <li><strong>Test Duration:</strong> 12 minutes</li>
          <li><strong>Test Tenants:</strong> 4</li>
          <li><strong>Stress Multiplier:</strong> 10x normal load</li>
        </ul>
        
        ${
          crossTenantLeakCount > 0
            ? `
        <h2>⚠️ CRITICAL: Isolation Violations Detected</h2>
        <p style="color: red; font-weight: bold;">
          ${crossTenantLeakCount} cross-tenant data leaks were detected during stress testing.
          This indicates a serious multi-tenant isolation vulnerability that must be addressed immediately.
        </p>
        `
            : `
        <h2>🎉 Isolation Maintained Under Stress</h2>
        <p style="color: green; font-weight: bold;">
          No cross-tenant data leaks detected during 10x stress load testing.
          Multi-tenant isolation is robust and production-ready.
        </p>
        `
        }
      </body>
      </html>
    `,
  };

  return report;
}
