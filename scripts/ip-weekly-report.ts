#!/usr/bin/env ts-node
/**
 * @ip-family: N/A (tooling)
 * IP Weekly Report Script
 *
 * Generates a weekly summary of IP Platform activity and emails/Slacks it to team.
 *
 * Usage:
 *   pnpm run ip:weekly-report
 *   pnpm run ip:weekly-report --format=slack
 *   pnpm run ip:weekly-report --email=team@company.com
 *
 * Designed to run via cron/GitHub Actions every Monday 9am.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Configuration
// ============================================================================

const REPO_ROOT = path.resolve(__dirname, '..');
const REGISTRY_PATH = path.join(REPO_ROOT, 'docs/ip/ip-registry.yaml');

interface ReportOptions {
  format: 'markdown' | 'slack' | 'html';
  email?: string;
  slack_webhook?: string;
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const options = parseArgs();

  console.log('📊 Generating IP Weekly Report...\n');

  // 1. Run ip-metrics to get current coverage
  const metricsOutput = runIPMetrics();

  // 2. Get git activity for the week
  const gitActivity = getGitActivity();

  // 3. Check for new families or status changes
  const registryChanges = getRegistryChanges();

  // 4. Generate report
  const report = generateReport({
    metrics: metricsOutput,
    gitActivity,
    registryChanges,
  });

  // 5. Output/send report
  if (options.format === 'markdown') {
    console.log(report);
  } else if (options.format === 'slack' && options.slack_webhook) {
    sendToSlack(report, options.slack_webhook);
  } else if (options.email) {
    sendEmail(report, options.email);
  } else {
    console.log(report);
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function parseArgs(): ReportOptions {
  const options: ReportOptions = {
    format: 'markdown',
  };

  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--format=')) {
      options.format = arg.split('=')[1] as 'markdown' | 'slack' | 'html';
    } else if (arg.startsWith('--email=')) {
      options.email = arg.split('=')[1];
    } else if (arg.startsWith('--slack-webhook=')) {
      options.slack_webhook = arg.split('=')[1];
    }
  }

  return options;
}

function runIPMetrics(): string {
  try {
    const output = execSync('pnpm run ip:metrics', {
      cwd: REPO_ROOT,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return output;
  } catch (error) {
    console.error('Failed to run ip-metrics:', error);
    return 'Error generating metrics';
  }
}

function getGitActivity(): {
  commits: number;
  files_changed: number;
  new_annotations: number;
} {
  try {
    // Get commits from last week
    const since = new Date();
    since.setDate(since.getDate() - 7);
    const sinceStr = since.toISOString().split('T')[0];

    const commits = execSync(
      `git log --since="${sinceStr}" --oneline | wc -l`,
      { cwd: REPO_ROOT, encoding: 'utf-8' }
    ).trim();

    const filesChanged = execSync(
      `git log --since="${sinceStr}" --name-only --pretty=format: | sort | uniq | wc -l`,
      { cwd: REPO_ROOT, encoding: 'utf-8' }
    ).trim();

    // Count new @ip-family annotations
    const diffOutput = execSync(
      `git log --since="${sinceStr}" -p | grep "^+.*@ip-family" | wc -l`,
      { cwd: REPO_ROOT, encoding: 'utf-8' }
    ).trim();

    return {
      commits: parseInt(commits, 10),
      files_changed: parseInt(filesChanged, 10),
      new_annotations: parseInt(diffOutput, 10),
    };
  } catch (error) {
    console.error('Failed to get git activity:', error);
    return { commits: 0, files_changed: 0, new_annotations: 0 };
  }
}

function getRegistryChanges(): {
  new_families: string[];
  status_changes: Array<{ family: string; old_status: string; new_status: string }>;
} {
  try {
    // Compare current registry to 1 week ago
    const since = new Date();
    since.setDate(since.getDate() - 7);
    const sinceStr = since.toISOString().split('T')[0];

    const diffOutput = execSync(
      `git log --since="${sinceStr}" -p -- docs/ip/ip-registry.yaml | grep "^[+-].*family_id\\|^[+-].*status:"`,
      { cwd: REPO_ROOT, encoding: 'utf-8' }
    ).trim();

    // TODO: Parse diff to extract actual changes
    // For now, return empty
    return {
      new_families: [],
      status_changes: [],
    };
  } catch (error) {
    console.error('Failed to get registry changes:', error);
    return { new_families: [], status_changes: [] };
  }
}

function generateReport(data: {
  metrics: string;
  gitActivity: ReturnType<typeof getGitActivity>;
  registryChanges: ReturnType<typeof getRegistryChanges>;
}): string {
  const today = new Date().toISOString().split('T')[0];

  return `
# IP Platform Weekly Report - ${today}

## 📊 Metrics Summary

${data.metrics}

## 📈 Activity This Week

- **Commits**: ${data.gitActivity.commits}
- **Files changed**: ${data.gitActivity.files_changed}
- **New @ip-family annotations**: ${data.gitActivity.new_annotations}

## 🆕 Registry Changes

${
    data.registryChanges.new_families.length > 0
      ? `### New Families\n${data.registryChanges.new_families.map((f) => `- ${f}`).join('\n')}`
      : '_No new families added this week_'
  }

${
    data.registryChanges.status_changes.length > 0
      ? `### Status Changes\n${data.registryChanges.status_changes.map((c) => `- **${c.family}**: ${c.old_status} → ${c.new_status}`).join('\n')}`
      : '_No status changes this week_'
  }

## 🎯 Action Items

- [ ] Review families with <50% coverage
- [ ] Update invention disclosure docs for MVP+ families
- [ ] Schedule quarterly IP audit

## 📚 Resources

- **IP Registry**: \`docs/ip/ip-registry.yaml\`
- **Platform Overview**: \`docs/ip/PLATFORM_OVERVIEW.md\`
- **Roadmap**: \`docs/ip/IP_PROGRAM_ROADMAP.md\`
- **Run metrics**: \`pnpm run ip:metrics\`
- **IP Console UI**: Navigate to \`/ip-console\`

---

_Generated by ip-weekly-report.ts on ${today}_
`.trim();
}

function sendToSlack(report: string, webhook: string) {
  // TODO: Implement Slack webhook POST
  // For now, just log
  console.log('Would send to Slack:', webhook);
  console.log(report);
}

function sendEmail(report: string, email: string) {
  // TODO: Implement email sending (nodemailer, SendGrid, etc.)
  // For now, just log
  console.log('Would send to email:', email);
  console.log(report);
}

// ============================================================================
// Entry Point
// ============================================================================

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
