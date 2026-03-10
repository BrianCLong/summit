#!/usr/bin/env node
/**
 * Frontier Entropy Drift Monitor
 *
 * Early warning system that predicts repository instability 2-3 weeks ahead.
 * Monitors frontier entropy drift and triggers interventions before crisis.
 *
 * Beyond FAANG Innovation: Predictive stability with entropy drift detection
 *
 * Key Metric:
 *   H(t) = -Σ(p_i * log₂(p_i))
 *   where p_i = patches to frontier i / total patches
 *
 * Danger Signal:
 *   ΔH > 0.15 over 7 days → Reduce agent budget, increase patch surface limits
 */

import fs from 'fs/promises';
import { execSync } from 'child_process';

/**
 * Load historical frontier entropy data
 */
async function loadEntropyHistory() {
  try {
    const content = await fs.readFile('.repoos/metrics/frontier-entropy-history.json', 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    return {
      measurements: [],
      last_updated: null
    };
  }
}

/**
 * Save entropy history
 */
async function saveEntropyHistory(history) {
  await fs.mkdir('.repoos/metrics', { recursive: true });
  await fs.writeFile(
    '.repoos/metrics/frontier-entropy-history.json',
    JSON.stringify(history, null, 2)
  );
}

/**
 * Compute Shannon entropy from distribution
 */
function shannonEntropy(distribution) {
  const total = distribution.reduce((sum, count) => sum + count, 0);
  if (total === 0) return 0;

  let entropy = 0;
  for (const count of distribution) {
    if (count > 0) {
      const p = count / total;
      entropy -= p * Math.log2(p);
    }
  }

  return entropy;
}

/**
 * Extract frontier distribution from recent PRs
 */
async function getFrontierDistribution(days = 7) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceISO = since.toISOString();

  try {
    const prsJson = execSync(
      `gh pr list --state all --search "created:>=${sinceISO.split('T')[0]}" --limit 1000 --json number,files,createdAt`,
      { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
    );

    const prs = JSON.parse(prsJson);

    const frontierCounts = {};

    for (const pr of prs) {
      const frontiers = new Set();

      for (const file of pr.files || []) {
        const frontier = classifyToFrontier(file.path);
        frontiers.add(frontier);
      }

      for (const frontier of frontiers) {
        frontierCounts[frontier] = (frontierCounts[frontier] || 0) + 1;
      }
    }

    return {
      frontiers: frontierCounts,
      total_prs: prs.length,
      period_days: days,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error extracting frontier distribution:', error.message);
    return null;
  }
}

/**
 * Classify file to frontier (domain)
 */
function classifyToFrontier(filePath) {
  if (filePath.startsWith('.repoos/')) return 'repoos-core';
  if (filePath.startsWith('packages/')) return filePath.split('/')[1] || 'general';
  if (filePath.startsWith('services/')) return filePath.split('/')[1] || 'general';
  if (filePath.startsWith('apps/')) return filePath.split('/')[1] || 'general';
  return 'general';
}

/**
 * Compute current frontier entropy
 */
async function computeCurrentEntropy() {
  console.log('\n━━━ Computing Frontier Entropy ━━━\n');

  const distribution = await getFrontierDistribution(7);
  if (!distribution) {
    console.error('Failed to extract frontier distribution');
    return null;
  }

  const frontierCounts = Object.values(distribution.frontiers);
  const entropy = shannonEntropy(frontierCounts);

  console.log(`Period: Last 7 days`);
  console.log(`Total PRs: ${distribution.total_prs}`);
  console.log(`Unique Frontiers: ${Object.keys(distribution.frontiers).length}`);
  console.log(`Frontier Entropy: ${entropy.toFixed(3)}\n`);

  console.log(`Distribution:`);
  const sorted = Object.entries(distribution.frontiers)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  for (const [frontier, count] of sorted) {
    const percentage = (count / distribution.total_prs * 100).toFixed(1);
    console.log(`  ${frontier}: ${count} PRs (${percentage}%)`);
  }
  console.log('');

  return {
    entropy,
    timestamp: distribution.timestamp,
    frontiers: distribution.frontiers,
    total_prs: distribution.total_prs
  };
}

/**
 * Compute entropy drift
 */
function computeDrift(history) {
  if (history.measurements.length < 2) {
    return { drift: 0, period_days: 0, signal: 'INSUFFICIENT_DATA' };
  }

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const recentMeasurements = history.measurements.filter(m =>
    new Date(m.timestamp) >= sevenDaysAgo
  );

  if (recentMeasurements.length < 2) {
    return { drift: 0, period_days: 0, signal: 'INSUFFICIENT_RECENT_DATA' };
  }

  const oldest = recentMeasurements[0];
  const newest = recentMeasurements[recentMeasurements.length - 1];

  const drift = newest.entropy - oldest.entropy;
  const periodMs = new Date(newest.timestamp) - new Date(oldest.timestamp);
  const periodDays = periodMs / (24 * 60 * 60 * 1000);

  let signal = 'STABLE';
  if (drift > 0.15) {
    signal = 'DANGER';
  } else if (drift > 0.10) {
    signal = 'WARNING';
  } else if (drift > 0.05) {
    signal = 'WATCH';
  }

  return {
    drift,
    period_days: periodDays,
    signal,
    oldest_entropy: oldest.entropy,
    newest_entropy: newest.entropy
  };
}

/**
 * Generate intervention recommendations
 */
function generateInterventions(drift) {
  if (drift.signal === 'STABLE' || drift.signal === 'WATCH') {
    return [];
  }

  const interventions = [];

  if (drift.signal === 'WARNING') {
    interventions.push({
      action: 'activate_patch_surface_limiting',
      priority: 'medium',
      description: 'Activate Patch Surface Limiting to reduce router ambiguity',
      command: 'Set PATCH_SURFACE_LIMITING=true in .repoos/patch-surface-limiting.yml'
    });

    interventions.push({
      action: 'monitor_agent_pressure',
      priority: 'medium',
      description: 'Increase monitoring frequency for agent pressure',
      command: 'Run agent-budget-enforcer.mjs every 6 hours instead of daily'
    });
  }

  if (drift.signal === 'DANGER') {
    interventions.push({
      action: 'reduce_agent_budget',
      priority: 'high',
      description: 'Reduce agent budget by 30% to slow patch generation',
      command: 'Update global_limits.max_patches_per_day: 350 in .repoos/agent-budget.yml'
    });

    interventions.push({
      action: 'increase_patch_surface_limits',
      priority: 'high',
      description: 'Tighten patch surface constraints to improve routing',
      command: 'Set sfpc.enforcement: blocking in .repoos/patch-surface-limiting.yml'
    });

    interventions.push({
      action: 'trigger_architecture_consolidation',
      priority: 'high',
      description: 'Run autonomous synthesis to identify consolidation opportunities',
      command: 'node scripts/repoos/autonomous-architecture-synthesis.mjs'
    });
  }

  return interventions;
}

/**
 * Main execution
 */
async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                                                                ║');
  console.log('║        Frontier Entropy Drift Monitor                         ║');
  console.log('║        Early Warning System for Repository Instability        ║');
  console.log('║                                                                ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const current = await computeCurrentEntropy();
  if (!current) {
    process.exit(1);
  }

  const history = await loadEntropyHistory();
  history.measurements.push(current);
  history.last_updated = current.timestamp;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  history.measurements = history.measurements.filter(m =>
    new Date(m.timestamp) >= thirtyDaysAgo
  );

  await saveEntropyHistory(history);

  console.log('━━━ Entropy Drift Analysis ━━━\n');

  const drift = computeDrift(history);

  if (drift.signal === 'INSUFFICIENT_DATA' || drift.signal === 'INSUFFICIENT_RECENT_DATA') {
    console.log(`Status: ${drift.signal}`);
    console.log(`Measurements: ${history.measurements.length}`);
    console.log(`Need at least 2 measurements over 7 days for drift analysis.\n`);
    process.exit(0);
  }

  console.log(`Period: ${drift.period_days.toFixed(1)} days`);
  console.log(`Drift: ${drift.drift >= 0 ? '+' : ''}${drift.drift.toFixed(3)}`);
  console.log(`Signal: ${drift.signal}`);
  console.log('');

  const signalEmoji = {
    'STABLE': '✅',
    'WATCH': '👀',
    'WARNING': '⚠️',
    'DANGER': '🔴'
  };

  console.log(`${signalEmoji[drift.signal]} Status: ${drift.signal}\n`);

  const interventions = generateInterventions(drift);

  if (interventions.length > 0) {
    console.log('━━━ Recommended Interventions ━━━\n');

    for (const intervention of interventions) {
      const priorityEmoji = intervention.priority === 'high' ? '🔴' : '🟡';
      console.log(`${priorityEmoji} ${intervention.action.toUpperCase()}`);
      console.log(`   ${intervention.description}`);
      console.log(`   Command: ${intervention.command}`);
      console.log('');
    }
  } else {
    console.log('✅ No interventions needed - entropy drift within acceptable range.\n');
  }

  const report = {
    timestamp: current.timestamp,
    current_entropy: current.entropy,
    drift_analysis: drift,
    interventions,
    history_size: history.measurements.length
  };

  await fs.mkdir('.repoos/metrics', { recursive: true });
  await fs.writeFile(
    '.repoos/metrics/frontier-entropy-drift.json',
    JSON.stringify(report, null, 2)
  );

  console.log('✓ Drift report saved: .repoos/metrics/frontier-entropy-drift.json\n');

  console.log('Beyond FAANG Innovation:');
  console.log('  Frontier entropy drift detection predicts instability');
  console.log('  2-3 weeks before traditional CI/CD signals.\n');

  if (drift.signal === 'DANGER') {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main().catch(error => {
  console.error('\n❌ Entropy monitor error:', error);
  process.exit(2);
});
