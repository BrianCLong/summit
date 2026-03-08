#!/usr/bin/env node

/**
 * CI Metrics Collection
 *
 * Tracks CI health metrics to provide early warning before saturation:
 * - Queue depth
 * - PR gate duration
 * - Merge queue latency
 * - Failure rate
 * - Workflow trigger frequency
 *
 * Usage: node scripts/ci/ci_metrics.mjs [--save]
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const METRICS_DIR = path.join(__dirname, '../../docs/ci/metrics');
const SAVE_METRICS = process.argv.includes('--save');

class CIMetrics {
  constructor() {
    this.metrics = {
      timestamp: new Date().toISOString(),
      queue: {},
      prGate: {},
      mergeQueue: {},
      failures: {},
      workflows: {}
    };
  }

  exec(command) {
    try {
      return execSync(command, { encoding: 'utf-8' }).trim();
    } catch (err) {
      return null;
    }
  }

  async collectQueueMetrics() {
    console.log('\n📊 Collecting queue metrics...');

    // Queued runs
    const queued = this.exec('gh run list --status queued --limit 200 --json databaseId');
    const queuedCount = queued ? JSON.parse(queued).length : 0;

    // In progress runs
    const inProgress = this.exec('gh run list --status in_progress --limit 200 --json databaseId');
    const inProgressCount = inProgress ? JSON.parse(inProgress).length : 0;

    this.metrics.queue = {
      queued: queuedCount,
      in_progress: inProgressCount,
      total: queuedCount + inProgressCount,
      health: this.assessQueueHealth(queuedCount)
    };

    console.log(`  Queued: ${queuedCount}`);
    console.log(`  In Progress: ${inProgressCount}`);
    console.log(`  Health: ${this.metrics.queue.health}`);
  }

  assessQueueHealth(queueDepth) {
    if (queueDepth === 0) return 'HEALTHY';
    if (queueDepth < 20) return 'NORMAL';
    if (queueDepth < 50) return 'WARNING';
    if (queueDepth < 100) return 'CRITICAL';
    return 'GRIDLOCK';
  }

  async collectPRGateMetrics() {
    console.log('\n⏱️  Collecting PR gate metrics...');

    // Get recent pr-gate runs
    const runs = this.exec(
      'gh run list --workflow=pr-gate.yml --limit 50 --json conclusion,createdAt,updatedAt,status'
    );

    if (!runs) {
      console.log('  No pr-gate runs found');
      return;
    }

    const runData = JSON.parse(runs);
    const completed = runData.filter(r => r.status === 'completed');

    if (completed.length === 0) {
      console.log('  No completed runs');
      return;
    }

    // Calculate durations
    const durations = completed.map(r => {
      const created = new Date(r.createdAt);
      const updated = new Date(r.updatedAt);
      return (updated - created) / 1000 / 60; // minutes
    });

    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const maxDuration = Math.max(...durations);
    const minDuration = Math.min(...durations);

    // Calculate failure rate
    const failures = completed.filter(r => r.conclusion === 'failure').length;
    const failureRate = (failures / completed.length) * 100;

    this.metrics.prGate = {
      runs_analyzed: completed.length,
      avg_duration_min: Math.round(avgDuration * 10) / 10,
      max_duration_min: Math.round(maxDuration * 10) / 10,
      min_duration_min: Math.round(minDuration * 10) / 10,
      failure_rate_pct: Math.round(failureRate * 10) / 10,
      pass_rate_pct: Math.round((100 - failureRate) * 10) / 10,
      health: avgDuration < 20 ? 'HEALTHY' : 'SLOW'
    };

    console.log(`  Avg Duration: ${this.metrics.prGate.avg_duration_min} min`);
    console.log(`  Pass Rate: ${this.metrics.prGate.pass_rate_pct}%`);
    console.log(`  Health: ${this.metrics.prGate.health}`);
  }

  async collectMergeQueueMetrics() {
    console.log('\n🚂 Collecting merge queue metrics...');

    // Get PRs in merge queue
    const queuedPRs = this.exec('gh pr list --search "is:queued" --json number,title,createdAt');

    if (!queuedPRs) {
      console.log('  No PRs in merge queue');
      this.metrics.mergeQueue = {
        depth: 0,
        health: 'HEALTHY'
      };
      return;
    }

    const prs = JSON.parse(queuedPRs);

    if (prs.length === 0) {
      console.log('  No PRs in merge queue');
      this.metrics.mergeQueue = {
        depth: 0,
        health: 'HEALTHY'
      };
      return;
    }

    // Calculate average wait time
    const now = new Date();
    const waitTimes = prs.map(pr => {
      const created = new Date(pr.createdAt);
      return (now - created) / 1000 / 60; // minutes
    });

    const avgWait = waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length;

    this.metrics.mergeQueue = {
      depth: prs.length,
      avg_wait_min: Math.round(avgWait * 10) / 10,
      max_wait_min: Math.round(Math.max(...waitTimes) * 10) / 10,
      health: prs.length < 10 ? 'HEALTHY' : prs.length < 25 ? 'NORMAL' : 'CONGESTED'
    };

    console.log(`  Queue Depth: ${this.metrics.mergeQueue.depth}`);
    console.log(`  Avg Wait: ${this.metrics.mergeQueue.avg_wait_min} min`);
    console.log(`  Health: ${this.metrics.mergeQueue.health}`);
  }

  async collectWorkflowFrequency() {
    console.log('\n📈 Collecting workflow frequency metrics...');

    // Get workflow runs from last 24 hours
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const runs = this.exec(
      'gh run list --limit 500 --json workflowName,createdAt,status'
    );

    if (!runs) {
      console.log('  No recent runs found');
      return;
    }

    const runData = JSON.parse(runs);
    const recent = runData.filter(r => new Date(r.createdAt) > yesterday);

    // Count by workflow
    const frequency = {};
    recent.forEach(r => {
      frequency[r.workflowName] = (frequency[r.workflowName] || 0) + 1;
    });

    // Sort by frequency
    const sorted = Object.entries(frequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    this.metrics.workflows = {
      total_runs_24h: recent.length,
      unique_workflows: Object.keys(frequency).length,
      top_10: Object.fromEntries(sorted)
    };

    console.log(`  Total Runs (24h): ${recent.length}`);
    console.log(`  Unique Workflows: ${Object.keys(frequency).length}`);
    console.log('  Top 5:');
    sorted.slice(0, 5).forEach(([name, count]) => {
      console.log(`    ${name}: ${count}`);
    });
  }

  async saveMetrics() {
    if (!SAVE_METRICS) return;

    // Ensure metrics directory exists
    if (!fs.existsSync(METRICS_DIR)) {
      fs.mkdirSync(METRICS_DIR, { recursive: true });
    }

    // Save to timestamped file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = path.join(METRICS_DIR, `ci-metrics-${timestamp}.json`);

    fs.writeFileSync(filename, JSON.stringify(this.metrics, null, 2));
    console.log(`\n💾 Metrics saved to: ${filename}`);

    // Also update latest.json
    const latestFile = path.join(METRICS_DIR, 'latest.json');
    fs.writeFileSync(latestFile, JSON.stringify(this.metrics, null, 2));
    console.log(`💾 Latest metrics: ${latestFile}`);
  }

  printSummary() {
    console.log('\n═══════════════════════════════════════');
    console.log('   CI Health Summary');
    console.log('═══════════════════════════════════════');

    console.log(`\nQueue Health: ${this.metrics.queue.health}`);
    console.log(`  - Queued: ${this.metrics.queue.queued}`);
    console.log(`  - In Progress: ${this.metrics.queue.in_progress}`);

    if (this.metrics.prGate.health) {
      console.log(`\nPR Gate Health: ${this.metrics.prGate.health}`);
      console.log(`  - Avg Duration: ${this.metrics.prGate.avg_duration_min} min (target: <20)`);
      console.log(`  - Pass Rate: ${this.metrics.prGate.pass_rate_pct}% (target: >95%)`);
    }

    if (this.metrics.mergeQueue.health) {
      console.log(`\nMerge Queue Health: ${this.metrics.mergeQueue.health}`);
      console.log(`  - Depth: ${this.metrics.mergeQueue.depth} (target: <25)`);
      if (this.metrics.mergeQueue.avg_wait_min) {
        console.log(`  - Avg Wait: ${this.metrics.mergeQueue.avg_wait_min} min`);
      }
    }

    if (this.metrics.workflows.total_runs_24h) {
      console.log(`\nWorkflow Activity (24h):`);
      console.log(`  - Total Runs: ${this.metrics.workflows.total_runs_24h}`);
      console.log(`  - Active Workflows: ${this.metrics.workflows.unique_workflows}`);
    }

    console.log('\n═══════════════════════════════════════\n');

    // Warnings
    const warnings = [];
    if (this.metrics.queue.queued > 50) {
      warnings.push('⚠️  Queue depth >50 - risk of saturation');
    }
    if (this.metrics.prGate.avg_duration_min > 20) {
      warnings.push('⚠️  PR gate >20 min - slower than target');
    }
    if (this.metrics.prGate.pass_rate_pct < 95) {
      warnings.push('⚠️  PR gate pass rate <95% - investigate failures');
    }
    if (this.metrics.mergeQueue.depth > 25) {
      warnings.push('⚠️  Merge queue depth >25 - congestion risk');
    }

    if (warnings.length > 0) {
      console.log('⚠️  Warnings:');
      warnings.forEach(w => console.log(`  ${w}`));
      console.log('');
    } else {
      console.log('✅ All metrics within healthy ranges!\n');
    }
  }

  async run() {
    console.log('═══════════════════════════════════════');
    console.log('   CI Metrics Collection');
    console.log('═══════════════════════════════════════');

    await this.collectQueueMetrics();
    await this.collectPRGateMetrics();
    await this.collectMergeQueueMetrics();
    await this.collectWorkflowFrequency();

    this.printSummary();

    if (SAVE_METRICS) {
      await this.saveMetrics();
    } else {
      console.log('ℹ️  Run with --save to persist metrics\n');
    }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const metrics = new CIMetrics();
  metrics.run().catch(err => {
    console.error('Error collecting metrics:', err);
    process.exit(1);
  });
}

export default CIMetrics;
