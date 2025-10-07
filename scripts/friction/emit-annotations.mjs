#!/usr/bin/env node

// scripts/friction/emit-annotations.mjs
// Emits friction annotations and metrics based on build performance
// Detects issues like slow builds, test flakes, resource contention

import fs from 'fs';
import { execSync } from 'child_process';

// Parse command line arguments
const args = process.argv.slice(2);
const route = args.find(arg => arg.startsWith('--route='))?.split('=')[1] || 'baseline';

// Default values for friction thresholds
const FRICTION_THRESHOLDS = {
  build_time_ms: 300000, // 5 minutes
  test_time_ms: 180000,   // 3 minutes  
  cache_hit_ratio: 0.7,   // 70% cache hit rate
  flake_rate: 0.05,       // 5% flake rate
  queue_time_ms: 60000    // 1 minute max queue time
};

// Get environment variables from CI
const ciEnv = {
  runId: process.env.GITHUB_RUN_ID || 'unknown',
  jobId: process.env.GITHUB_JOB || 'unknown',
  repo: process.env.GITHUB_REPOSITORY || 'unknown',
  ref: process.env.GITHUB_REF || 'unknown',
  actor: process.env.GITHUB_ACTOR || 'unknown',
  eventName: process.env.GITHUB_EVENT_NAME || 'unknown',
  sha: process.env.GITHUB_SHA ? process.env.GITHUB_SHA.substring(0, 7) : 'unknown'
};

function collectMetrics() {
  console.log('Collecting build metrics for friction analysis...');

  try {
    // Calculate build time (if available)
    const startTime = process.env.BUILD_START_TIME ? 
      parseInt(process.env.BUILD_START_TIME) : Date.now() - 10000; // fallback
    const buildTime = Date.now() - startTime;

    // Check cache status
    const cacheHit = process.env.CACHE_HIT === 'true' || 
      (process.env.CACHE_HIT && process.env.CACHE_HIT !== '0');
    
    // Get test results if available
    let testResults = { pass: 0, fail: 0, skip: 0, time: 0 };
    try {
      if (fs.existsSync('reports/junit/junit.xml')) {
        const junitContent = fs.readFileSync('reports/junit/junit.xml', 'utf8');
        // Simple regex parsing for test results (could be more sophisticated)
        const testsMatch = junitContent.match(/tests="(\d+)"/);
        const failuresMatch = junitContent.match(/failures="(\d+)"/);
        const skippedMatch = junitContent.match(/skipped="(\d+)"/);
        const timeMatch = junitContent.match(/time="([\d.]+)/);
        
        if (testsMatch && failuresMatch && skippedMatch) {
          const total = parseInt(testsMatch[1]);
          const failures = parseInt(failuresMatch[1]);
          const skipped = parseInt(skippedMatch[1]);
          testResults = {
            pass: total - failures - skipped,
            fail: failures,
            skip: skipped,
            time: timeMatch ? parseFloat(timeMatch[1]) * 1000 : 0
          };
        }
      }
    } catch (e) {
      console.log('⚠️ Could not parse test results:', e.message);
    }

    return {
      buildTime,
      cacheHit,
      testResults,
      route,
      ...ciEnv
    };
  } catch (error) {
    console.log('⚠️ Error collecting metrics:', error.message);
    return {
      buildTime: 0,
      cacheHit: false,
      testResults: { pass: 0, fail: 0, skip: 0, time: 0 },
      route,
      ...ciEnv
    };
  }
}

function analyzeFriction(metrics) {
  console.log('Analyzing friction points...');
  
  const frictionSignals = [];
  
  // Build time friction
  if (metrics.buildTime > FRICTION_THRESHOLDS.build_time_ms) {
    frictionSignals.push({
      type: 'BUILD_SLOW',
      severity: 'warning',
      message: `Build took ${metrics.buildTime}ms, exceeding threshold of ${FRICTION_THRESHOLDS.build_time_ms}ms`,
      value: metrics.buildTime,
      threshold: FRICTION_THRESHOLDS.build_time_ms
    });
  }
  
  // Test time friction
  if (metrics.testResults.time > FRICTION_THRESHOLDS.test_time_ms) {
    frictionSignals.push({
      type: 'TEST_SLOW', 
      severity: 'warning',
      message: `Tests took ${metrics.testResults.time}ms, exceeding threshold of ${FRICTION_THRESHOLDS.test_time_ms}ms`,
      value: metrics.testResults.time,
      threshold: FRICTION_THRESHOLDS.test_time_ms
    });
  }
  
  // Flake detection
  if (metrics.testResults.fail > 0) {
    const flakeRate = metrics.testResults.fail / (metrics.testResults.pass + metrics.testResults.fail);
    if (flakeRate > FRICTION_THRESHOLDS.flake_rate) {
      frictionSignals.push({
        type: 'TEST_FLAKY',
        severity: 'warning', 
        message: `High flake rate: ${flakeRate.toFixed(3)} (>${FRICTION_THRESHOLDS.flake_rate})`,
        value: flakeRate,
        threshold: FRICTION_THRESHOLDS.flake_rate
      });
    }
  }
  
  // Cache efficiency
  if (!metrics.cacheHit) {
    frictionSignals.push({
      type: 'CACHE_MISS',
      severity: 'info',
      message: 'Cache miss detected, may impact build performance',
      value: 'miss',
      threshold: 'hit'
    });
  }
  
  return frictionSignals;
}

function emitAnnotations(frictionSignals, metrics) {
  console.log('Emitting friction annotations...');
  
  // Output GitHub Actions annotations format
  frictionSignals.forEach(signal => {
    const message = `[${signal.severity.toUpperCase()}] ${signal.type}: ${signal.message}`;
    console.log(`::${signal.severity} file=ci-analysis,title=${signal.type}::${message}`);
  });
  
  // Output metrics for OpenTelemetry
  console.log(`# Friction Analysis Results`);
  console.log(`route=${metrics.route}`);
  console.log(`build_time_ms=${metrics.buildTime}`);
  console.log(`cache_hit=${metrics.cacheHit}`);
  console.log(`tests_pass=${metrics.testResults.pass}`);
  console.log(`tests_fail=${metrics.testResults.fail}`);
  console.log(`tests_skip=${metrics.testResults.skip}`);
  console.log(`test_time_ms=${metrics.testResults.time}`);
  
  // Additional CI context
  console.log(`ci_run_id=${metrics.runId}`);
  console.log(`ci_job_id=${metrics.jobId}`);
  console.log(`ci_repo=${metrics.repo}`);
  console.log(`ci_sha=${metrics.sha}`);
  console.log(`ci_route=${metrics.route}`);
  
  // Friction count
  console.log(`friction_signals=${frictionSignals.length}`);
  
  return frictionSignals.length;
}

function main() {
  console.log(`Analyzing friction for route: ${route}`);
  
  // Collect metrics
  const metrics = collectMetrics();
  
  // Analyze for friction points
  const frictionSignals = analyzeFriction(metrics);
  
  // Emit annotations and metrics
  const frictionCount = emitAnnotations(frictionSignals, metrics);
  
  // Exit with code based on friction detection
  const hasCriticalFriction = frictionSignals.some(
    signal => signal.severity === 'warning' && 
    ['BUILD_SLOW', 'TEST_SLOW', 'TEST_FLAKY'].includes(signal.type)
  );
  
  console.log(`Friction analysis complete. Signals detected: ${frictionCount}`);
  console.log(`Critical friction detected: ${hasCriticalFriction}`);
  
  // Exit with non-zero if critical friction is detected
  process.exit(hasCriticalFriction ? 1 : 0);
}

// Run main function
main().catch(error => {
  console.error('Friction analysis failed:', error);
  process.exit(1);
});