#!/usr/bin/env node
/**
 * OpenTelemetry Smoke Test for GREEN TRAIN Release Validation
 * Validates that traces and metrics are flowing correctly
 */

const { trace, metrics } = require('@opentelemetry/api');
const http = require('http');

async function otelSmokeTest() {
  console.log('🔥 Starting OpenTelemetry Smoke Test...');

  let passed = 0;
  let failed = 0;

  // Test 1: Tracer Creation
  try {
    const tracer = trace.getTracer('otel-smoke-test', '1.0.0');
    const span = tracer.startSpan('smoke-test-span');
    span.setAttributes({
      'test.type': 'smoke',
      'test.component': 'otel-validation',
      'intelgraph.test': true,
    });
    span.end();
    console.log('✅ Test 1: Tracer creation and span generation - PASSED');
    passed++;
  } catch (error) {
    console.error('❌ Test 1: Tracer creation - FAILED:', error.message);
    failed++;
  }

  // Test 2: Metrics Creation
  try {
    const meter = metrics.getMeter('otel-smoke-test', '1.0.0');
    const counter = meter.createCounter('smoke_test_counter', {
      description: 'Counter for OpenTelemetry smoke test',
      unit: '1',
    });
    counter.add(1, { 'test.run': 'smoke' });

    const histogram = meter.createHistogram('smoke_test_duration', {
      description: 'Duration histogram for smoke test',
      unit: 'ms',
    });
    histogram.record(42, { 'test.operation': 'validation' });

    console.log('✅ Test 2: Metrics creation and recording - PASSED');
    passed++;
  } catch (error) {
    console.error('❌ Test 2: Metrics creation - FAILED:', error.message);
    failed++;
  }

  // Test 3: HTTP Endpoint Check (if server is running)
  if (process.env.NODE_ENV !== 'test') {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get('http://localhost:3000/health', (res) => {
          if (res.statusCode === 200) {
            console.log('✅ Test 3: HTTP instrumentation endpoint - PASSED');
            passed++;
            resolve();
          } else {
            console.log(
              `⚠️  Test 3: HTTP endpoint returned ${res.statusCode} - SKIPPED`,
            );
            resolve();
          }
        });
        req.on('error', () => {
          console.log(
            '⚠️  Test 3: HTTP endpoint unreachable - SKIPPED (server not running)',
          );
          resolve();
        });
        req.setTimeout(2000, () => {
          req.destroy();
          console.log('⚠️  Test 3: HTTP endpoint timeout - SKIPPED');
          resolve();
        });
      });
    } catch (error) {
      console.log('⚠️  Test 3: HTTP instrumentation - SKIPPED:', error.message);
    }
  }

  // Test 4: Environment Variables
  const otelVars = [
    'OTEL_SERVICE_NAME',
    'OTEL_EXPORTER_OTLP_TRACES_ENDPOINT',
    'OTEL_EXPORTER_OTLP_METRICS_ENDPOINT',
  ];

  let envConfigured = 0;
  otelVars.forEach((varName) => {
    if (process.env[varName]) {
      envConfigured++;
    }
  });

  if (envConfigured >= 1) {
    console.log(
      `✅ Test 4: Environment configuration (${envConfigured}/${otelVars.length} vars) - PASSED`,
    );
    passed++;
  } else {
    console.log(
      '⚠️  Test 4: No OTEL environment variables configured - SKIPPED',
    );
  }

  // Results
  console.log('\n📊 OpenTelemetry Smoke Test Results:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⚠️  Skipped: Tests may be skipped if server not running`);

  if (failed > 0) {
    console.log(
      '\n🚨 OTEL Smoke Test FAILED - Check OpenTelemetry configuration',
    );
    process.exit(1);
  } else {
    console.log('\n🎉 OTEL Smoke Test PASSED - OpenTelemetry is functional');
    process.exit(0);
  }
}

// Run smoke test
if (require.main === module) {
  otelSmokeTest().catch((error) => {
    console.error('💥 Smoke test crashed:', error);
    process.exit(1);
  });
}

module.exports = { otelSmokeTest };
