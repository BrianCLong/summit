#!/usr/bin/env tsx

/**
 * PR Backlog Monitor
 *
 * Monitors the status of open PRs, focusing on the "Mega-Merge" initiative.
 * Tracks:
 * - Total Open PRs
 * - Auto-Merge Enabled vs Disabled
 * - CI Status (Success, Failure, Pending)
 * - Mergeability (Conflicting vs Clean)
 *
 * Usage:
 *   npx tsx scripts/pr_backlog_monitor.ts [--mock]
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface PRStatus {
  number: number;
  title: string;
  state: string;
  mergeable: string; // 'MERGEABLE', 'CONFLICTING', 'UNKNOWN'
  autoMergeRequest: {
    enabledAt: string;
    mergeMethod: string;
  } | null;
  statusCheckRollup: {
    state: string; // 'SUCCESS', 'FAILURE', 'PENDING'
  } | null;
  author: {
    login: string;
  };
  createdAt: string;
}

interface BacklogStats {
  totalOpen: number;
  autoMergeEnabled: number;
  mergeable: {
    clean: number;
    conflicting: number;
    unknown: number;
  };
  ciStatus: {
    passing: number;
    failing: number;
    pending: number;
    missing: number;
  };
  ageDistribution: {
    over30Days: number;
    over7Days: number;
    recent: number;
  };
}

function getMockPRs(): PRStatus[] {
  console.log('⚠️  Using MOCK data for demonstration (gh CLI not found or --mock flag used)');
  const statuses = ['SUCCESS', 'FAILURE', 'PENDING', null];
  const mergeability = ['MERGEABLE', 'CONFLICTING', 'UNKNOWN'];

  return Array.from({ length: 494 }, (_, i) => ({
    number: 1000 + i,
    title: `Mock PR #${1000 + i} for backlog testing`,
    state: 'OPEN',
    mergeable: mergeability[Math.floor(Math.random() * mergeability.length)],
    autoMergeRequest: Math.random() > 0.5 ? { enabledAt: new Date().toISOString(), mergeMethod: 'SQUASH' } : null,
    statusCheckRollup: {
      state: statuses[Math.floor(Math.random() * statuses.length)] as string
    },
    author: { login: 'mock-user' },
    createdAt: new Date(Date.now() - Math.floor(Math.random() * 60 * 24 * 60 * 60 * 1000)).toISOString()
  }));
}

function fetchOpenPRs(): PRStatus[] {
  try {
    // Check if gh is installed
    try {
      execSync('gh --version', { stdio: 'ignore' });
    } catch (e) {
      if (process.argv.includes('--mock')) {
        return getMockPRs();
      }
      console.error('❌ Error: GitHub CLI (gh) is not installed or not in PATH.');
      console.error('   To run with mock data, use: npx tsx scripts/pr_backlog_monitor.ts --mock');
      process.exit(1);
    }

    if (process.argv.includes('--mock')) {
      return getMockPRs();
    }

    console.log('🔄 Fetching open PRs from GitHub (this may take a moment)...');
    const fields = 'number,title,state,mergeable,autoMergeRequest,statusCheckRollup,author,createdAt';
    // Limit to 1000 to cover the ~500 backlog
    const cmd = `gh pr list --state open --limit 1000 --json ${fields}`;
    const output = execSync(cmd, { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
    return JSON.parse(output);
  } catch (error) {
    console.error('❌ Failed to fetch PRs:', error);
    process.exit(1);
  }
}

function analyzeBacklog(prs: PRStatus[]): BacklogStats {
  const stats: BacklogStats = {
    totalOpen: prs.length,
    autoMergeEnabled: 0,
    mergeable: { clean: 0, conflicting: 0, unknown: 0 },
    ciStatus: { passing: 0, failing: 0, pending: 0, missing: 0 },
    ageDistribution: { over30Days: 0, over7Days: 0, recent: 0 }
  };

  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;

  for (const pr of prs) {
    // Auto Merge
    if (pr.autoMergeRequest) stats.autoMergeEnabled++;

    // Mergeability
    if (pr.mergeable === 'MERGEABLE') stats.mergeable.clean++;
    else if (pr.mergeable === 'CONFLICTING') stats.mergeable.conflicting++;
    else stats.mergeable.unknown++;

    // CI Status
    const status = pr.statusCheckRollup?.state;
    if (status === 'SUCCESS') stats.ciStatus.passing++;
    else if (status === 'FAILURE' || status === 'ERROR') stats.ciStatus.failing++;
    else if (status === 'PENDING') stats.ciStatus.pending++;
    else stats.ciStatus.missing++;

    // Age
    const created = new Date(pr.createdAt);
    const ageDays = (now.getTime() - created.getTime()) / dayMs;
    if (ageDays > 30) stats.ageDistribution.over30Days++;
    else if (ageDays > 7) stats.ageDistribution.over7Days++;
    else stats.ageDistribution.recent++;
  }

  return stats;
}

function generateProgressBar(current: number, total: number, width = 30): string {
  const percent = total > 0 ? current / total : 0;
  const filled = Math.round(percent * width);
  const empty = width - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  return `${bar} ${Math.round(percent * 100)}%`;
}

function printReport(stats: BacklogStats) {
  console.log('\n' + '='.repeat(60));
  console.log('  PR BACKLOG MONITOR - MEGA-MERGE STATUS');
  console.log('='.repeat(60));

  console.log(`\n📊 Total Open PRs: ${stats.totalOpen}`);

  console.log('\n🤖 Auto-Merge Status:');
  console.log(`   Enabled:  ${stats.autoMergeEnabled.toString().padEnd(5)} ${generateProgressBar(stats.autoMergeEnabled, stats.totalOpen)}`);
  console.log(`   Disabled: ${(stats.totalOpen - stats.autoMergeEnabled).toString().padEnd(5)} ${generateProgressBar(stats.totalOpen - stats.autoMergeEnabled, stats.totalOpen)}`);

  console.log('\n🚦 CI Health:');
  console.log(`   ✅ Passing: ${stats.ciStatus.passing.toString().padEnd(5)} ${generateProgressBar(stats.ciStatus.passing, stats.totalOpen)}`);
  console.log(`   ❌ Failing: ${stats.ciStatus.failing.toString().padEnd(5)} ${generateProgressBar(stats.ciStatus.failing, stats.totalOpen)}`);
  console.log(`   ⏳ Pending: ${stats.ciStatus.pending.toString().padEnd(5)} ${generateProgressBar(stats.ciStatus.pending, stats.totalOpen)}`);

  console.log('\n⚔️  Merge Conflicts:');
  console.log(`   Clean:       ${stats.mergeable.clean}`);
  console.log(`   Conflicting: ${stats.mergeable.conflicting} (Action Required)`);

  console.log('\n📅 Age Distribution:');
  console.log(`   > 30 Days: ${stats.ageDistribution.over30Days}`);
  console.log(`   > 7 Days:  ${stats.ageDistribution.over7Days}`);
  console.log(`   Recent:    ${stats.ageDistribution.recent}`);

  console.log('\n' + '='.repeat(60));

  // Action Items
  if (stats.mergeable.conflicting > 0) {
    console.log(`\n⚠️  ACTION REQUIRED: ${stats.mergeable.conflicting} PRs have conflicts and cannot be auto-merged.`);
    console.log(`   Run 'scripts/resolve_conflicts.sh' (if available) or manual triage.`);
  }

  if (stats.ciStatus.failing > 0) {
    console.log(`\n⚠️  ATTENTION: ${stats.ciStatus.failing} PRs are failing CI.`);
    console.log(`   Check 'scripts/ci_first_aid.sh' to diagnose common issues.`);
  }

  if (stats.autoMergeEnabled < stats.totalOpen) {
    console.log(`\nℹ️  TIP: ${stats.totalOpen - stats.autoMergeEnabled} PRs do not have auto-merge enabled.`);
    console.log(`   Run 'scripts/auto_merge_all_open_prs.sh' to enable.`);
  }
  console.log();
}

function main() {
  const prs = fetchOpenPRs();
  const stats = analyzeBacklog(prs);
  printReport(stats);

  // Save stats to file for historical tracking
  const reportPath = path.join(process.cwd(), 'pr-backlog-stats.json');
  fs.writeFileSync(reportPath, JSON.stringify({ timestamp: new Date(), stats }, null, 2));
  console.log(`📄 Detailed stats saved to: ${reportPath}`);
}

main();
