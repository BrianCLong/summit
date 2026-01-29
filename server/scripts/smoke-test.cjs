/**
 * Production Smoke Test Suite
 *
 * Verifies critical endpoints and system health post-deployment.
 * Exit codes: 0 = all passed, 1 = critical failure, 2 = degraded (non-critical)
 */
const axios = require('axios');

const BASE_URL = process.env.API_URL || 'http://localhost:4000';
const TIMEOUT_MS = parseInt(process.env.SMOKE_TEST_TIMEOUT_MS || '10000', 10);
const VERBOSE = process.env.SMOKE_TEST_VERBOSE === 'true';

const client = axios.create({
  baseURL: BASE_URL,
  timeout: TIMEOUT_MS,
  validateStatus: () => true, // Handle all status codes manually
});

const checks = [
  {
    name: 'Basic Health',
    endpoint: '/health',
    critical: true,
    validate: (res) => res.status === 200 && res.data?.status === 'ok',
  },
  {
    name: 'Liveness Probe',
    endpoint: '/health/live',
    critical: true,
    validate: (res) => res.status === 200 && res.data?.status === 'alive',
  },
  {
    name: 'Readiness Probe',
    endpoint: '/health/ready',
    critical: true,
    validate: (res) => res.status === 200 && res.data?.status === 'ready',
  },
  {
    name: 'Healthz (K8s)',
    endpoint: '/healthz',
    critical: true,
    validate: (res) => res.status === 200 && res.data?.status === 'ok',
  },
  {
    name: 'Readyz (K8s)',
    endpoint: '/readyz',
    critical: true,
    validate: (res) => res.status === 200,
  },
  {
    name: 'Metrics Endpoint',
    endpoint: '/metrics',
    critical: false,
    validate: (res) => res.status === 200 && res.data.includes('process_cpu'),
  },
  {
    name: 'API Docs Available',
    endpoint: '/api-docs/',
    critical: false,
    validate: (res) => res.status === 200,
  },
];

async function runCheck(check) {
  const startTime = Date.now();
  try {
    const response = await client.get(check.endpoint);
    const duration = Date.now() - startTime;
    const passed = check.validate(response);

    return {
      name: check.name,
      endpoint: check.endpoint,
      critical: check.critical,
      passed,
      status: response.status,
      duration,
      error: passed ? null : `Validation failed (status: ${response.status})`,
    };
  } catch (error) {
    return {
      name: check.name,
      endpoint: check.endpoint,
      critical: check.critical,
      passed: false,
      status: null,
      duration: Date.now() - startTime,
      error: error.message,
    };
  }
}

async function runSmokeTest() {
  console.log('='.repeat(60));
  console.log('Production Smoke Test Suite');
  console.log(`Target: ${BASE_URL}`);
  console.log(`Timeout: ${TIMEOUT_MS}ms`);
  console.log('='.repeat(60));
  console.log('');

  const results = await Promise.all(checks.map(runCheck));

  let criticalFailures = 0;
  let nonCriticalFailures = 0;

  for (const result of results) {
    const icon = result.passed ? '✅' : result.critical ? '❌' : '⚠️';
    const status = result.passed ? 'PASS' : 'FAIL';
    const timing = result.duration ? `(${result.duration}ms)` : '';

    console.log(`${icon} ${result.name}: ${status} ${timing}`);

    if (VERBOSE || !result.passed) {
      console.log(`   Endpoint: ${result.endpoint}`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    }

    if (!result.passed) {
      if (result.critical) {
        criticalFailures++;
      } else {
        nonCriticalFailures++;
      }
    }
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('Summary');
  console.log('='.repeat(60));
  console.log(`Total checks: ${results.length}`);
  console.log(`Passed: ${results.filter(r => r.passed).length}`);
  console.log(`Critical failures: ${criticalFailures}`);
  console.log(`Non-critical failures: ${nonCriticalFailures}`);

  if (criticalFailures > 0) {
    console.log('');
    console.log('❌ SMOKE TEST FAILED: Critical endpoint(s) unhealthy');
    process.exit(1);
  } else if (nonCriticalFailures > 0) {
    console.log('');
    console.log('⚠️ SMOKE TEST DEGRADED: Non-critical endpoint(s) unhealthy');
    process.exit(2);
  } else {
    console.log('');
    console.log('✅ SMOKE TEST PASSED: All endpoints healthy');
    process.exit(0);
  }
}

runSmokeTest().catch(err => {
  console.error('❌ Smoke test execution error:', err.message);
  process.exit(1);
});
