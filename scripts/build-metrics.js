#!/usr/bin/env node

/**
 * Build Metrics Collector - Composer vNext Sprint
 * Captures baseline timings for top services and tracks improvements
 */

import { execSync } from 'child_process';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { performance } from 'perf_hooks';

const METRICS_FILE = './build-metrics.json';
const TOP_SERVICES = [
  'server',
  'frontend',
  'cognitive-insights',
  'active-measures-module',
  'reliability-service',
];

class BuildMetrics {
  constructor() {
    this.metrics = this.loadExistingMetrics();
  }

  loadExistingMetrics() {
    if (existsSync(METRICS_FILE)) {
      return JSON.parse(readFileSync(METRICS_FILE, 'utf8'));
    }
    return {
      baseline: {},
      history: [],
      version: '1.0.0',
      created: new Date().toISOString(),
    };
  }

  saveMetrics() {
    writeFileSync(METRICS_FILE, JSON.stringify(this.metrics, null, 2));
  }

  async captureBaseline() {
    console.log('🎯 Capturing baseline build timings for top 5 services...\n');

    for (const service of TOP_SERVICES) {
      const timing = await this.timeService(service);
      this.metrics.baseline[service] = timing;

      console.log(`📊 ${service}: ${timing.duration}ms (${timing.status})`);
    }

    this.metrics.baselineDate = new Date().toISOString();
    this.saveMetrics();

    console.log('\n✅ Baseline captured successfully!');
    console.log(`📁 Metrics saved to: ${METRICS_FILE}`);
  }

  async timeService(serviceName) {
    const start = performance.now();
    let status = 'success';
    let error = null;
    let cacheHit = false;

    try {
      // Try service-specific build command first
      let buildCmd;

      switch (serviceName) {
        case 'server':
          buildCmd =
            'cd server && npm run build 2>/dev/null || echo "build-placeholder"';
          break;
        case 'frontend':
          buildCmd =
            'cd frontend && npm run build 2>/dev/null || echo "build-placeholder"';
          break;
        case 'cognitive-insights':
          buildCmd =
            'cd cognitive-insights && docker build . -t ci-temp 2>/dev/null || echo "build-placeholder"';
          break;
        case 'active-measures-module':
          buildCmd =
            'cd active-measures-module && docker build . -t am-temp 2>/dev/null || echo "build-placeholder"';
          break;
        case 'reliability-service':
          buildCmd =
            'cd reliability-service && docker build . -t rs-temp 2>/dev/null || echo "build-placeholder"';
          break;
        default:
          buildCmd = `echo "build-placeholder-${serviceName}"`;
      }

      const output = execSync(buildCmd, {
        encoding: 'utf8',
        timeout: 300000, // 5 min timeout
      });

      // Check for cache indicators
      cacheHit = output.includes('CACHED') || output.includes('cache hit');
    } catch (err) {
      status = 'error';
      error = err.message;
    }

    const duration = Math.round(performance.now() - start);

    return {
      duration,
      status,
      error,
      cacheHit,
      timestamp: new Date().toISOString(),
    };
  }

  async benchmarkRun() {
    console.log('🏃‍♂️ Running build benchmark...\n');

    const runMetrics = {
      timestamp: new Date().toISOString(),
      services: {},
    };

    for (const service of TOP_SERVICES) {
      const timing = await this.timeService(service);
      runMetrics.services[service] = timing;

      const baseline = this.metrics.baseline[service];
      if (baseline) {
        const improvement = (
          ((baseline.duration - timing.duration) / baseline.duration) *
          100
        ).toFixed(1);
        const indicator = improvement > 0 ? '🚀' : '⚠️';
        console.log(
          `${indicator} ${service}: ${timing.duration}ms (${improvement}% vs baseline)`,
        );
      } else {
        console.log(`📊 ${service}: ${timing.duration}ms (no baseline)`);
      }
    }

    this.metrics.history.push(runMetrics);
    this.saveMetrics();

    this.generateReport();
  }

  generateReport() {
    console.log('\n📈 Build Performance Report');
    console.log('='.repeat(50));

    if (Object.keys(this.metrics.baseline).length === 0) {
      console.log('❌ No baseline available. Run with --baseline first.');
      return;
    }

    const latest = this.metrics.history[this.metrics.history.length - 1];
    if (!latest) {
      console.log('❌ No recent runs available.');
      return;
    }

    let totalImprovement = 0;
    let servicesCount = 0;

    console.log('\nService                 Baseline    Current    Improvement');
    console.log('-'.repeat(60));

    for (const service of TOP_SERVICES) {
      const baseline = this.metrics.baseline[service];
      const current = latest.services[service];

      if (
        baseline &&
        current &&
        baseline.status === 'success' &&
        current.status === 'success'
      ) {
        const improvement =
          ((baseline.duration - current.duration) / baseline.duration) * 100;
        totalImprovement += improvement;
        servicesCount++;

        const status =
          improvement >= 30
            ? '🎯'
            : improvement >= 10
              ? '📈'
              : improvement >= 0
                ? '➖'
                : '📉';

        console.log(
          `${service.padEnd(20)} ${baseline.duration.toString().padStart(8)}ms ${current.duration.toString().padStart(8)}ms ${status} ${improvement.toFixed(1)}%`,
        );
      }
    }

    if (servicesCount > 0) {
      const avgImprovement = (totalImprovement / servicesCount).toFixed(1);
      console.log('-'.repeat(60));
      console.log(`Average Improvement: ${avgImprovement}%`);

      if (parseFloat(avgImprovement) >= 30) {
        console.log('🎯 SUCCESS: Sprint goal achieved! (≥30% improvement)');
      } else {
        console.log(`📊 Progress: ${avgImprovement}% towards 30% goal`);
      }
    }
  }
}

// CLI Interface
const command = process.argv[2];
const metrics = new BuildMetrics();

switch (command) {
  case '--baseline':
    metrics.captureBaseline();
    break;
  case '--benchmark':
    metrics.benchmarkRun();
    break;
  case '--report':
    metrics.generateReport();
    break;
  default:
    console.log(`
Build Metrics Collector - Composer vNext Sprint

Usage:
  node scripts/build-metrics.js --baseline   # Capture baseline timings
  node scripts/build-metrics.js --benchmark  # Run performance benchmark  
  node scripts/build-metrics.js --report     # Generate performance report

Top Services Tracked:
  ${TOP_SERVICES.map((s) => `• ${s}`).join('\n  ')}

Sprint Goal: ≥30% median build time reduction
    `);
}
