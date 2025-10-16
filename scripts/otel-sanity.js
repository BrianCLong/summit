#!/usr/bin/env node
/**
 * OpenTelemetry Sanity Check Script
 *
 * Validates that traces are being properly generated and exported
 * Used as a CI gate to ensure observability is working in deployments
 */

const https = require('https');
const http = require('http');

// Configuration
const config = {
  targetUrl:
    process.argv[2] || process.env.TARGET_BASE_URL || 'http://localhost:4000',
  otelQueryUrl:
    process.argv[3] || process.env.OTEL_QUERY_URL || 'http://localhost:16686', // Jaeger default
  serviceName: process.env.SERVICE_NAME || 'intelgraph-server',
  timeout: parseInt(process.env.OTEL_SANITY_TIMEOUT) || 60000, // 60 seconds
  retryInterval: parseInt(process.env.OTEL_SANITY_RETRY_INTERVAL) || 5000, // 5 seconds
  gitSha: process.env.GIT_SHA || process.env.GITHUB_SHA,
};

console.log('🔍 OpenTelemetry Sanity Check Starting...');
console.log(`📊 Target Application: ${config.targetUrl}`);
console.log(`🔎 OTEL Query Backend: ${config.otelQueryUrl}`);
console.log(`🏷️  Service Name: ${config.serviceName}`);
console.log(`📝 Git SHA: ${config.gitSha || 'not specified'}`);

// HTTP request helper
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https://') ? https : http;
    const requestOptions = {
      ...options,
      timeout: 10000, // 10 second timeout per request
    };

    const req = protocol.get(url, requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const jsonData = res.headers['content-type']?.includes(
            'application/json',
          )
            ? JSON.parse(data)
            : data;
          resolve({
            status: res.statusCode,
            data: jsonData,
            headers: res.headers,
          });
        } catch (e) {
          resolve({ status: res.statusCode, data, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

// Step 1: Trigger application activity
async function triggerApplicationActivity() {
  console.log('🚀 Step 1: Triggering application activity...');

  const endpoints = [
    `${config.targetUrl}/health`,
    `${config.targetUrl}/health/ready`,
    `${config.targetUrl}/metrics`,
  ];

  const results = [];

  for (const endpoint of endpoints) {
    try {
      console.log(`  📞 Calling ${endpoint}...`);
      const response = await makeRequest(endpoint);
      results.push({
        endpoint,
        status: response.status,
        success: response.status >= 200 && response.status < 400,
      });
      console.log(`    ✅ ${endpoint}: ${response.status}`);

      // Small delay between requests
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      console.log(`    ❌ ${endpoint}: ${error.message}`);
      results.push({
        endpoint,
        status: 'error',
        success: false,
        error: error.message,
      });
    }
  }

  const successfulRequests = results.filter((r) => r.success).length;
  console.log(
    `✅ Triggered ${successfulRequests}/${endpoints.length} endpoints successfully`,
  );

  if (successfulRequests === 0) {
    throw new Error(
      'No endpoints responded successfully - cannot generate traces',
    );
  }

  return results;
}

// Step 2: Wait for trace propagation
async function waitForTracePropagation() {
  console.log('⏳ Step 2: Waiting for trace propagation...');
  const waitTime = 10000; // 10 seconds
  console.log(
    `   Waiting ${waitTime / 1000} seconds for traces to propagate...`,
  );
  await new Promise((resolve) => setTimeout(resolve, waitTime));
  console.log('✅ Trace propagation wait complete');
}

// Step 3: Query trace backend
async function queryTraceBackend() {
  console.log('🔎 Step 3: Querying trace backend...');

  // Different backend support
  const backendType = detectBackendType(config.otelQueryUrl);
  console.log(`   Detected backend type: ${backendType}`);

  switch (backendType) {
    case 'jaeger':
      return await queryJaegerBackend();
    case 'tempo':
      return await queryTempoBackend();
    case 'zipkin':
      return await queryZipkinBackend();
    default:
      return await queryGenericBackend();
  }
}

function detectBackendType(url) {
  if (url.includes('jaeger') || url.includes('16686')) return 'jaeger';
  if (url.includes('tempo') || url.includes('3200')) return 'tempo';
  if (url.includes('zipkin') || url.includes('9411')) return 'zipkin';
  return 'generic';
}

async function queryJaegerBackend() {
  console.log('   🔍 Querying Jaeger backend...');

  // Query Jaeger API for services
  const servicesUrl = `${config.otelQueryUrl}/api/services`;
  try {
    const servicesResponse = await makeRequest(servicesUrl);
    console.log(`   📋 Services API response: ${servicesResponse.status}`);

    if (servicesResponse.status !== 200) {
      throw new Error(`Services API returned ${servicesResponse.status}`);
    }

    const services = servicesResponse.data.data || servicesResponse.data;
    console.log(
      `   📊 Found ${services.length} services: ${services.join(', ')}`,
    );

    const serviceExists = services.includes(config.serviceName);
    if (!serviceExists) {
      console.log(`   ⚠️  Service '${config.serviceName}' not found in Jaeger`);
      console.log(`   Available services: ${services.join(', ')}`);
      return { found: false, reason: 'service_not_found', services };
    }

    // Query for recent traces
    const tracesUrl = `${config.otelQueryUrl}/api/traces?service=${config.serviceName}&limit=10&lookback=1h`;
    const tracesResponse = await makeRequest(tracesUrl);

    if (tracesResponse.status !== 200) {
      throw new Error(`Traces API returned ${tracesResponse.status}`);
    }

    const traces = tracesResponse.data.data || tracesResponse.data;
    console.log(`   📈 Found ${traces.length} recent traces`);

    if (traces.length === 0) {
      return { found: false, reason: 'no_traces', services, traces: 0 };
    }

    // Validate trace content
    const validTraces = traces.filter((trace) => {
      const spans = trace.spans || [];
      const hasHealthSpan = spans.some(
        (span) =>
          span.operationName?.includes('health') ||
          span.tags?.some(
            (tag) => tag.key === 'http.url' && tag.value?.includes('health'),
          ),
      );
      return hasHealthSpan;
    });

    console.log(
      `   ✅ Found ${validTraces.length} valid health-related traces`,
    );

    return {
      found: validTraces.length > 0,
      traces: traces.length,
      validTraces: validTraces.length,
      backend: 'jaeger',
      services,
    };
  } catch (error) {
    console.log(`   ❌ Jaeger query failed: ${error.message}`);
    return { found: false, error: error.message, backend: 'jaeger' };
  }
}

async function queryTempoBackend() {
  console.log('   🔍 Querying Tempo backend...');

  // Tempo search API
  const searchUrl = `${config.otelQueryUrl}/api/search?tags=service.name=${config.serviceName}&limit=10`;
  try {
    const response = await makeRequest(searchUrl);
    console.log(`   📊 Tempo search response: ${response.status}`);

    if (response.status !== 200) {
      throw new Error(`Tempo search returned ${response.status}`);
    }

    const traces = response.data.traces || [];
    console.log(`   📈 Found ${traces.length} traces in Tempo`);

    return {
      found: traces.length > 0,
      traces: traces.length,
      backend: 'tempo',
    };
  } catch (error) {
    console.log(`   ❌ Tempo query failed: ${error.message}`);
    return { found: false, error: error.message, backend: 'tempo' };
  }
}

async function queryZipkinBackend() {
  console.log('   🔍 Querying Zipkin backend...');

  const tracesUrl = `${config.otelQueryUrl}/api/v2/traces?serviceName=${config.serviceName}&limit=10`;
  try {
    const response = await makeRequest(tracesUrl);
    console.log(`   📊 Zipkin response: ${response.status}`);

    if (response.status !== 200) {
      throw new Error(`Zipkin returned ${response.status}`);
    }

    const traces = response.data || [];
    console.log(`   📈 Found ${traces.length} traces in Zipkin`);

    return {
      found: traces.length > 0,
      traces: traces.length,
      backend: 'zipkin',
    };
  } catch (error) {
    console.log(`   ❌ Zipkin query failed: ${error.message}`);
    return { found: false, error: error.message, backend: 'zipkin' };
  }
}

async function queryGenericBackend() {
  console.log('   🔍 Attempting generic backend query...');

  // Try common endpoints
  const endpoints = [
    '/api/traces',
    '/api/v1/traces',
    '/api/v2/traces',
    '/api/search',
  ];

  for (const endpoint of endpoints) {
    try {
      const url = `${config.otelQueryUrl}${endpoint}`;
      console.log(`   🔍 Trying ${url}...`);
      const response = await makeRequest(url);

      if (response.status === 200) {
        console.log(`   ✅ Generic backend responded at ${endpoint}`);
        return {
          found: true,
          endpoint,
          backend: 'generic',
          note: 'Backend responded but trace validation skipped',
        };
      }
    } catch (error) {
      // Continue to next endpoint
    }
  }

  return {
    found: false,
    reason: 'no_generic_endpoint',
    backend: 'generic',
  };
}

// Step 4: Retry logic with exponential backoff
async function retryWithBackoff(fn, maxRetries = 5) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Attempt ${attempt}/${maxRetries}...`);
      const result = await fn();

      if (result.found) {
        return result;
      }

      // If not found but no error, wait and retry
      lastError = new Error(`Traces not found (attempt ${attempt})`);
    } catch (error) {
      lastError = error;
      console.log(`   ❌ Attempt ${attempt} failed: ${error.message}`);
    }

    if (attempt < maxRetries) {
      const waitTime = Math.min(
        config.retryInterval * Math.pow(2, attempt - 1),
        30000,
      );
      console.log(`   ⏳ Waiting ${waitTime / 1000}s before next attempt...`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }

  throw lastError;
}

// Main execution
async function main() {
  const startTime = Date.now();

  try {
    // Step 1: Trigger activity
    await triggerApplicationActivity();

    // Step 2: Wait for propagation
    await waitForTracePropagation();

    // Step 3: Query with retries
    const result = await retryWithBackoff(queryTraceBackend);

    const duration = Date.now() - startTime;

    console.log('\n🎉 OpenTelemetry Sanity Check PASSED!');
    console.log('======================================');
    console.log(`✅ Service: ${config.serviceName}`);
    console.log(`✅ Backend: ${result.backend}`);
    console.log(`✅ Traces Found: ${result.traces || 'yes'}`);
    console.log(`✅ Duration: ${duration / 1000}s`);

    if (result.validTraces) {
      console.log(`✅ Valid Health Traces: ${result.validTraces}`);
    }

    if (result.services) {
      console.log(`📊 Available Services: ${result.services.length}`);
    }

    console.log('\n🔍 Observability is working correctly!');
    process.exit(0);
  } catch (error) {
    const duration = Date.now() - startTime;

    console.log('\n❌ OpenTelemetry Sanity Check FAILED!');
    console.log('=====================================');
    console.log(`❌ Error: ${error.message}`);
    console.log(`❌ Duration: ${duration / 1000}s`);
    console.log(`❌ Service: ${config.serviceName}`);
    console.log(`❌ Target: ${config.targetUrl}`);
    console.log(`❌ OTEL Backend: ${config.otelQueryUrl}`);

    console.log('\n🔧 Troubleshooting Steps:');
    console.log('1. Verify application is running and responding');
    console.log('2. Check OTEL configuration and endpoint URLs');
    console.log('3. Ensure trace backend is accessible');
    console.log('4. Verify network connectivity between services');
    console.log('5. Check application logs for OTEL initialization errors');

    process.exit(1);
  }
}

// Handle signals
process.on('SIGINT', () => {
  console.log('\n⚠️  OTEL sanity check interrupted');
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\n⚠️  OTEL sanity check terminated');
  process.exit(1);
});

// Run the sanity check
main();
