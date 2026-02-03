/**
 * Production Smoke Test Suite
 *
 * Verifies critical endpoints and system health post-deployment.
 * Exit codes: 0 = all passed, 1 = critical failure, 2 = degraded (non-critical)
 */
const axios = require('axios');

const BASE_URL = process.env.API_URL || 'http://localhost:4000';
const TIMEOUT_MS = parseInt(process.env.SMOKE_TEST_TIMEOUT_MS || '10000', 10);
const PREFLIGHT_TIMEOUT_MS = parseInt(process.env.SMOKE_PREFLIGHT_TIMEOUT_MS || '2000', 10);
const SMOKE_MODE = (process.env.SMOKE_MODE || 'full').toLowerCase();

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
    modes: ['standalone', 'full'],
    validate: (res) => res.status === 200 && res.data?.status === 'ok',
  },
  {
    name: 'Liveness Probe',
    endpoint: '/health/live',
    critical: true,
    modes: ['standalone', 'full'],
    validate: (res) => res.status === 200 && res.data?.status === 'alive',
  },
  {
    name: 'Readiness Probe',
    endpoint: '/health/ready',
    critical: true,
    modes: ['full'],
    validate: (res) => res.status === 200 && res.data?.status === 'ready',
  },
  {
    name: 'Healthz (K8s)',
    endpoint: '/healthz',
    critical: true,
    modes: ['standalone', 'full'],
    validate: (res) => res.status === 200 && res.data?.status === 'ok',
  },
  {
    name: 'Readyz (K8s)',
    endpoint: '/readyz',
    critical: true,
    modes: ['full'],
    validate: (res) => res.status === 200,
  },
  {
    name: 'Metrics Endpoint',
    endpoint: '/metrics',
    critical: false,
    modes: ['full'],
    validate: (res) => res.status === 200 && res.data.includes('process_cpu'),
  },
  {
    name: 'API Docs Available',
    endpoint: '/api-docs/',
    critical: false,
    modes: ['full'],
    validate: (res) => res.status === 200,
  },
];

function buildCurlCommand(url, timeoutMs) {
  const seconds = Math.max(1, Math.ceil(timeoutMs / 1000));
  return `curl -v --max-time ${seconds} "${url}"`;
}

function formatBodySnippet(data, maxLen = 500) {
  if (data === undefined || data === null) {
    return '<empty>';
  }
  let text;
  if (typeof data === 'string') {
    text = data;
  } else {
    try {
      text = JSON.stringify(data);
    } catch (err) {
      text = String(data);
    }
  }
  if (text.length <= maxLen) {
    return text;
  }
  return `${text.slice(0, maxLen)}...`;
}

function getHostPort(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.hostname}:${parsed.port || (parsed.protocol === 'https:' ? '443' : '80')}`;
  } catch (err) {
    return url;
  }
}

function collectReadinessFailures(data) {
  const failures = [];
  const visited = new Set();
  const statusOk = new Set(['ok', 'ready', 'alive', 'healthy', 'pass', 'up']);

  function record(path, detail) {
    const message = detail ? `${path} (${detail})` : path;
    if (!visited.has(message)) {
      visited.add(message);
      failures.push(message);
    }
  }

  function visit(value, path) {
    if (value === false) {
      record(path, 'false');
      return;
    }
    if (!value || typeof value !== 'object') {
      return;
    }

    const status = value.status;
    if (typeof status === 'string' && !statusOk.has(status.toLowerCase())) {
      record(path || 'root', `status=${status}`);
    }
    const boolKeys = ['ok', 'healthy', 'ready', 'up', 'alive', 'pass'];
    for (const key of boolKeys) {
      if (value[key] === false) {
        record(path || 'root', `${key}=false`);
      }
    }

    const collections = ['checks', 'components', 'dependencies', 'deps', 'services'];
    for (const key of collections) {
      if (value[key] && typeof value[key] === 'object') {
        for (const [childKey, childVal] of Object.entries(value[key])) {
          visit(childVal, path ? `${path}.${key}.${childKey}` : `${key}.${childKey}`);
        }
      }
    }
  }

  if (data && typeof data === 'object') {
    visit(data, '');
  }

  return failures;
}

async function runCheck(check) {
  const startTime = Date.now();
  const url = `${BASE_URL}${check.endpoint}`;
  try {
    const response = await client.get(check.endpoint);
    const duration = Date.now() - startTime;
    const passed = check.validate(response);

    return {
      name: check.name,
      endpoint: check.endpoint,
      url,
      critical: check.critical,
      passed,
      status: response.status,
      data: response.data,
      duration,
      error: passed ? null : `Validation failed (status: ${response.status})`,
    };
  } catch (error) {
    const hostPort = getHostPort(url);
    return {
      name: check.name,
      endpoint: check.endpoint,
      url,
      hostPort,
      critical: check.critical,
      passed: false,
      status: null,
      duration: Date.now() - startTime,
      error: error.message,
      code: error.code,
    };
  }
}

async function runSmokeTest() {
  console.log('='.repeat(60));
  console.log(`Summit Smoke Test Suite [MODE: ${SMOKE_MODE.toUpperCase()}]`);
  console.log(`Target: ${BASE_URL}`);
  console.log(`Timeout: ${TIMEOUT_MS}ms`);
  console.log('='.repeat(60));
  console.log('');

  if (!['standalone', 'full'].includes(SMOKE_MODE)) {
    console.error(`❌ Invalid SMOKE_MODE: ${SMOKE_MODE}`);
    console.error('   Expected SMOKE_MODE=standalone|full');
    process.exit(1);
  }

  const preflightUrl = `${BASE_URL}/health`;
  try {
    const preflightResponse = await axios.get(preflightUrl, { timeout: PREFLIGHT_TIMEOUT_MS, validateStatus: () => true });
    if (preflightResponse.status === 404) {
      console.error('❌ PREFLIGHT FAILED: Health endpoint mismatch.');
      console.error(`   Expected /health at ${BASE_URL}`);
      console.error(`   Status: ${preflightResponse.status}`);
      console.error(`   Body:   ${formatBodySnippet(preflightResponse.data)}`);
      console.error(`   Repro:  ${buildCurlCommand(preflightUrl, PREFLIGHT_TIMEOUT_MS)}`);
      process.exit(1);
    }
  } catch (error) {
    const hostPort = getHostPort(preflightUrl);
    console.error(`❌ PREFLIGHT FAILED: Target ${BASE_URL} is unreachable.`);
    console.error(`   Error: ${error.message}`);
    if (error.code) {
      console.error(`   Network: ${error.code} (${hostPort})`);
    }
    console.error(`   Repro:  ${buildCurlCommand(preflightUrl, PREFLIGHT_TIMEOUT_MS)}`);
    console.error('   Hint: Ensure the server is running (npm start) or use a different API_URL.');
    process.exit(1);
  }

  const activeChecks = checks.filter((check) => check.modes.includes(SMOKE_MODE));
  const results = await Promise.all(activeChecks.map(runCheck));

  let criticalFailures = 0;
  let nonCriticalFailures = 0;

  for (const result of results) {
    const icon = result.passed ? '✅' : result.critical ? '❌' : '⚠️';
    const status = result.passed ? 'PASS' : 'FAIL';
    const timing = result.duration ? `(${result.duration}ms)` : '';

    console.log(`${icon} ${result.name}: ${status} ${timing}`);

    console.log(`   Endpoint: ${result.endpoint}`);
    if (result.status !== null && result.status !== undefined) {
      console.log(`   Status:   ${result.status}`);
      console.log(`   Body:     ${formatBodySnippet(result.data)}`);
      console.log(`   Timing:   ${result.duration}ms`);
    } else if (result.code) {
      console.log(`   Network:  ${result.code} (${result.hostPort || getHostPort(result.url)})`);
    }

    if (!result.passed && result.error) {
      console.log(`   Error:    ${result.error}`);
    }

    if (result.endpoint === '/health/ready' && result.data && typeof result.data === 'object') {
      const failures = collectReadinessFailures(result.data);
      if (failures.length > 0) {
        console.log('   Readiness failures:');
        for (const failure of failures) {
          console.log(`     - ${failure}`);
        }
      }
    }

    console.log(`   Repro:    ${buildCurlCommand(result.url, TIMEOUT_MS)}`);
    console.log('');

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
