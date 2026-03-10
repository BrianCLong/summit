#!/usr/bin/env node
import fs from 'fs/promises';
import { execSync } from 'child_process';

async function loadThroughputHistory() {
  try {
    const content = await fs.readFile('.repoos/metrics/merge-throughput-history.json', 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    return { measurements: [], last_updated: null };
  }
}

async function saveThroughputHistory(history) {
  await fs.mkdir('.repoos/metrics', { recursive: true });
  await fs.writeFile(
    '.repoos/metrics/merge-throughput-history.json',
    JSON.stringify(history, null, 2)
  );
}

async function countMerges(days = 7) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceISO = since.toISOString();

  try {
    const prsJson = execSync(
      `gh pr list --state merged --search "merged:>=${sinceISO.split('T')[0]}" --limit 1000 --json number,mergedAt`,
      { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
    );

    const prs = JSON.parse(prsJson);

    return {
      total: prs.length,
      per_day: prs.length / days,
      period_days: days,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error counting merges:', error.message);
    return null;
  }
}

async function computeMergeThroughput() {
  console.log('\n━━━ Computing Merge Throughput ━━━\n');

  const currentWeek = await countMerges(7);
  if (!currentWeek) {
    console.error('Failed to extract current week merges');
    return null;
  }

  const since = new Date();
  since.setDate(since.getDate() - 14);
  const until = new Date();
  until.setDate(until.getDate() - 7);

  try {
    const prsJson = execSync(
      `gh pr list --state merged --search "merged:${since.toISOString().split('T')[0]}..${until.toISOString().split('T')[0]}" --limit 1000 --json number,mergedAt`,
      { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
    );

    const prs = JSON.parse(prsJson);
    const previousWeek = {
      total: prs.length,
      per_day: prs.length / 7,
      period_days: 7,
      timestamp: until.toISOString()
    };

    console.log(`Current Week (last 7 days):`);
    console.log(`  Total Merges: ${currentWeek.total}`);
    console.log(`  Per Day: ${currentWeek.per_day.toFixed(1)}\n`);

    console.log(`Previous Week:`);
    console.log(`  Total Merges: ${previousWeek.total}`);
    console.log(`  Per Day: ${previousWeek.per_day.toFixed(1)}\n`);

    const woWChange = previousWeek.per_day > 0
      ? ((currentWeek.per_day - previousWeek.per_day) / previousWeek.per_day) * 100
      : 0;

    console.log(`Week-over-Week Change: ${woWChange >= 0 ? '+' : ''}${woWChange.toFixed(1)}%\n`);

    let level = 'HEALTHY';
    let emoji = '✅';

    if (woWChange < -30) {
      level = 'DANGER';
      emoji = '🔴';
    } else if (woWChange < -20) {
      level = 'WARNING';
      emoji = '⚠️';
    } else if (woWChange < -10) {
      level = 'WATCH';
      emoji = '🟡';
    } else if (woWChange > 50) {
      level = 'SURGE';
      emoji = '🚀';
    }

    console.log(`${emoji} Throughput Level: ${level}\n`);

    return {
      current_week: currentWeek,
      previous_week: previousWeek,
      week_over_week_change: woWChange,
      level,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error extracting previous week merges:', error.message);
    return null;
  }
}

function computeLongTermTrend(history) {
  if (history.measurements.length < 4) {
    return { trend: 0, direction: 'INSUFFICIENT_DATA' };
  }

  const recent = history.measurements.slice(-4);

  const x = recent.map((_, i) => i);
  const y = recent.map(m => m.current_week.per_day);

  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

  let direction = 'STABLE';
  if (slope > 2) {
    direction = 'RISING_FAST';
  } else if (slope > 0.5) {
    direction = 'RISING';
  } else if (slope < -2) {
    direction = 'FALLING_FAST';
  } else if (slope < -0.5) {
    direction = 'FALLING';
  }

  return {
    slope,
    direction,
    weeks_analyzed: n
  };
}

function generateInterventions(current, trend) {
  const interventions = [];

  if (current.level === 'DANGER') {
    interventions.push({
      action: 'pause_patch_generation',
      priority: 'critical',
      description: 'Pause all agent patch generation until congestion clears',
      command: 'Update global_limits.max_patches_per_day: 0 in .repoos/agent-budget.yml'
    });

    interventions.push({
      action: 'increase_merge_budget',
      priority: 'critical',
      description: 'Increase review capacity to clear backlog',
      command: 'Assign additional reviewers, extend review hours'
    });

    interventions.push({
      action: 'prioritize_consolidation',
      priority: 'critical',
      description: 'Fast-track consolidation patches to reduce queue complexity',
      command: 'Label consolidation PRs with "priority-critical"'
    });
  }

  if (current.level === 'WARNING' || (current.level === 'WATCH' && trend.direction === 'FALLING_FAST')) {
    interventions.push({
      action: 'reduce_patch_generation',
      priority: 'high',
      description: 'Reduce agent budget by 30% as preventive measure',
      command: 'Update global_limits.max_patches_per_day: 350 in .repoos/agent-budget.yml'
    });

    interventions.push({
      action: 'trigger_consolidation',
      priority: 'high',
      description: 'Run synthesis to consolidate pending patches',
      command: 'node scripts/repoos/autonomous-architecture-synthesis.mjs'
    });
  }

  if (current.level === 'SURGE') {
    interventions.push({
      action: 'monitor_quality',
      priority: 'medium',
      description: 'High merge rate - verify review quality is maintained',
      command: 'Review recent merge quality metrics and reviewer workload'
    });
  }

  return interventions;
}

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                                                                ║');
  console.log('║        Merge Throughput Stability Monitor                     ║');
  console.log('║        Early Warning for Merge Queue Congestion               ║');
  console.log('║                                                                ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const current = await computeMergeThroughput();
  if (!current) {
    process.exit(1);
  }

  const history = await loadThroughputHistory();
  history.measurements.push(current);
  history.last_updated = current.timestamp;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  history.measurements = history.measurements.filter(m =>
    new Date(m.timestamp) >= thirtyDaysAgo
  );

  await saveThroughputHistory(history);

  console.log('━━━ Long-Term Trend Analysis ━━━\n');

  const trend = computeLongTermTrend(history);

  if (trend.direction === 'INSUFFICIENT_DATA') {
    console.log(`Status: ${trend.direction}`);
    console.log(`Measurements: ${history.measurements.length}`);
    console.log(`Need at least 4 weeks of measurements for trend analysis.\n`);
  } else {
    console.log(`Slope: ${trend.slope.toFixed(2)} merges/day/week`);
    console.log(`Direction: ${trend.direction}`);
    console.log(`Weeks Analyzed: ${trend.weeks_analyzed}\n`);
  }

  const interventions = generateInterventions(current, trend);

  if (interventions.length > 0) {
    console.log('━━━ Recommended Interventions ━━━\n');

    for (const intervention of interventions) {
      const priorityEmoji = intervention.priority === 'critical' ? '🔴' :
                           intervention.priority === 'high' ? '🟡' : '🔵';
      console.log(`${priorityEmoji} ${intervention.action.toUpperCase()}`);
      console.log(`   ${intervention.description}`);
      console.log(`   Command: ${intervention.command}`);
      console.log('');
    }
  } else {
    console.log('✅ No interventions needed - merge throughput stable.\n');
  }

  const report = {
    timestamp: current.timestamp,
    current_week_per_day: current.current_week.per_day,
    previous_week_per_day: current.previous_week.per_day,
    week_over_week_change: current.week_over_week_change,
    level: current.level,
    long_term_trend: trend,
    interventions,
    history_size: history.measurements.length
  };

  await fs.mkdir('.repoos/metrics', { recursive: true });
  await fs.writeFile(
    '.repoos/metrics/merge-throughput-report.json',
    JSON.stringify(report, null, 2)
  );

  console.log('✓ Throughput report saved: .repoos/metrics/merge-throughput-report.json\n');

  console.log('Beyond FAANG Innovation:');
  console.log('  Merge throughput monitoring detects queue congestion');
  console.log('  before agent pressure spikes and entropy rises.\n');

  if (current.level === 'DANGER') {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main().catch(error => {
  console.error('\n❌ Merge throughput monitor error:', error);
  process.exit(2);
});
