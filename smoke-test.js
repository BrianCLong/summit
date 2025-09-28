#!/usr/bin/env node

const http = require('http');
const https = require('https');
const { URL } = require('url');

const isCi = process.argv.includes('--ci');
const timeoutMs = 5000;

function log(message) {
  if (!isCi) {
    console.log(message);
  }
}

function requestJson(target, { method = 'GET', headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(target);
    const client = url.protocol === 'https:' ? https : http;
    const options = {
      method,
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: `${url.pathname}${url.search}`,
      headers,
      timeout: timeoutMs
    };

    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk.toString();
      });
      res.on('end', () => {
        resolve({ status: res.statusCode || 0, body: data });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy(new Error('timeout'));
    });

    if (body) {
      req.write(body);
    }

    req.end();
  });
}

async function testEndpoint(url, description) {
  try {
    const response = await requestJson(url);
    const ok = response.status >= 200 && response.status < 400;
    console.log(`${ok ? '✅' : '❌'} ${description}: ${response.status}`);
    return ok;
  } catch (error) {
    console.log(`❌ ${description}: ${error.message}`);
    return false;
  }
}

async function testGraphQL() {
  const payload = JSON.stringify({ query: '{ __typename }' });
  try {
    const response = await requestJson('http://localhost:4000/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      },
      body: payload
    });
    const parsed = JSON.parse(response.body || '{}');
    const ok = parsed?.data?.__typename === 'Query';
    console.log(`${ok ? '✅' : '❌'} GraphQL API: ${ok ? 'resolved schema root' : 'unexpected response'}`);
    return ok;
  } catch (error) {
    console.log(`❌ GraphQL API: ${error.message}`);
    return false;
  }
}

async function runSmokeTests() {
  log('🚀 Running IntelGraph Local Dev Kit smoke tests...');

  const checks = [
    () => testEndpoint('http://localhost:3000', 'Frontend (UI)'),
    () => testEndpoint('http://localhost:4000/health', 'API health'),
    () => testGraphQL(),
    () => testEndpoint('http://localhost:4010/health', 'Mock services'),
    () => testEndpoint('http://localhost:4100/health', 'Worker health'),
    () => testEndpoint('http://localhost:8181/health', 'OPA health'),
    () => testEndpoint('http://localhost:9464/metrics', 'OTEL collector metrics'),
    () => testEndpoint('http://localhost:16686', 'Jaeger UI')
  ];

  let passed = 0;
  for (const check of checks) {
    // eslint-disable-next-line no-await-in-loop
    if (await check()) {
      passed += 1;
    }
  }

  const total = checks.length;
  console.log(`📊 Smoke summary: ${passed}/${total} checks passed`);

  if (passed === total) {
    console.log('🎉 All smoke checks passed in under 60 seconds.');
    process.exit(0);
  }

  console.log('⚠️  Smoke checks failed. Review logs above for details.');
  process.exit(1);
}

runSmokeTests().catch((error) => {
  console.error('Smoke suite crashed:', error);
  process.exit(1);
});
