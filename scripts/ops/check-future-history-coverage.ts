#!/usr/bin/env npx ts-node --esm
/**
 * Future History Coverage Checker
 *
 * CI script that warns when large PRs lack a Future History entry.
 * Designed to run in GitHub Actions as a non-blocking check.
 *
 * Usage:
 *   pnpm future-history:check
 *   pnpm future-history:check --strict  # Fail instead of warn
 *
 * Environment variables:
 *   GITHUB_EVENT_PATH - Path to GitHub event JSON (set by Actions)
 *   FH_LINES_THRESHOLD - Lines changed threshold (default: 500)
 *   FH_FILES_THRESHOLD - Files changed threshold (default: 10)
 *   FH_STRICT - Fail instead of warn (default: false)
 *
 * Exit codes:
 *   0 - Pass (entry exists or PR below threshold)
 *   1 - Fail (strict mode, entry missing)
 *   2 - Error (script failure)
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// Configuration
const CONFIG = {
  linesThreshold: parseInt(process.env.FH_LINES_THRESHOLD || '500', 10),
  filesThreshold: parseInt(process.env.FH_FILES_THRESHOLD || '10', 10),
  strict: process.env.FH_STRICT === 'true' || process.argv.includes('--strict'),
  logPath: 'docs/future-history/LOG.md',
  skipMarker: '[fh-skip]',
  epicLabels: ['epic', 'major', 'breaking-change', 'architecture', 'security'],
};

// Types
interface PRStats {
  additions: number;
  deletions: number;
  changedFiles: number;
  labels: string[];
  title: string;
  body: string;
  number: number;
}

interface CheckResult {
  pass: boolean;
  reason: string;
  suggestion?: string;
}

// Get PR stats from git diff or GitHub event
function getPRStats(): PRStats | null {
  // Try GitHub Actions event first
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (eventPath && fs.existsSync(eventPath)) {
    try {
      const event = JSON.parse(fs.readFileSync(eventPath, 'utf-8'));
      if (event.pull_request) {
        return {
          additions: event.pull_request.additions || 0,
          deletions: event.pull_request.deletions || 0,
          changedFiles: event.pull_request.changed_files || 0,
          labels: (event.pull_request.labels || []).map(
            (l: { name: string }) => l.name,
          ),
          title: event.pull_request.title || '',
          body: event.pull_request.body || '',
          number: event.pull_request.number || 0,
        };
      }
    } catch (e) {
      console.warn('Warning: Could not parse GitHub event file');
    }
  }

  // Try gh CLI
  try {
    const result = execSync(
      'gh pr view --json additions,deletions,changedFiles,labels,title,body,number 2>/dev/null',
      { encoding: 'utf-8', timeout: 10000 },
    );
    const data = JSON.parse(result);
    return {
      additions: data.additions || 0,
      deletions: data.deletions || 0,
      changedFiles: data.changedFiles || 0,
      labels: (data.labels || []).map((l: { name: string }) => l.name),
      title: data.title || '',
      body: data.body || '',
      number: data.number || 0,
    };
  } catch {
    // gh CLI not available
  }

  // Fall back to git diff stats
  try {
    const baseBranch = process.env.GITHUB_BASE_REF || 'main';

    // Get diff stats
    const diffStat = execSync(
      `git diff --stat ${baseBranch}...HEAD 2>/dev/null || git diff --stat HEAD~1`,
      {
        encoding: 'utf-8',
        timeout: 10000,
      },
    );

    // Parse diff stat output
    const lines = diffStat.trim().split('\n');
    const summaryLine = lines[lines.length - 1];
    const filesMatch = summaryLine.match(/(\d+) files? changed/);
    const insertMatch = summaryLine.match(/(\d+) insertions?/);
    const deleteMatch = summaryLine.match(/(\d+) deletions?/);

    return {
      additions: insertMatch ? parseInt(insertMatch[1], 10) : 0,
      deletions: deleteMatch ? parseInt(deleteMatch[1], 10) : 0,
      changedFiles: filesMatch ? parseInt(filesMatch[1], 10) : lines.length - 1,
      labels: [],
      title: '',
      body: '',
      number: 0,
    };
  } catch {
    console.warn('Warning: Could not determine PR stats from git');
    return null;
  }
}

// Check if PR has skip marker
function hasSkipMarker(stats: PRStats): boolean {
  return (
    stats.body.includes(CONFIG.skipMarker) ||
    stats.title.includes(CONFIG.skipMarker)
  );
}

// Check if PR has epic-level labels
function hasEpicLabels(stats: PRStats): boolean {
  return stats.labels.some((label) =>
    CONFIG.epicLabels.some((epic) => label.toLowerCase().includes(epic)),
  );
}

// Check if PR exceeds thresholds
function exceedsThresholds(stats: PRStats): boolean {
  const totalLines = stats.additions + stats.deletions;
  return (
    totalLines >= CONFIG.linesThreshold ||
    stats.changedFiles >= CONFIG.filesThreshold
  );
}

// Check if Future History entry exists for this PR
function hasFutureHistoryEntry(stats: PRStats): boolean {
  const logPath = path.resolve(process.cwd(), CONFIG.logPath);

  if (!fs.existsSync(logPath)) {
    return false;
  }

  const content = fs.readFileSync(logPath, 'utf-8');

  // Check for PR number reference
  if (stats.number > 0 && content.includes(`#${stats.number}`)) {
    return true;
  }

  // Check for recent entry (within last 7 days)
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    if (content.includes(`### ${dateStr}:`)) {
      // Found recent entry, check if it might cover this PR
      // This is a heuristic - we assume recent entries are relevant
      return true;
    }
  }

  return false;
}

// Check if PR changes Future History files
function changesFutureHistory(): boolean {
  try {
    const baseBranch = process.env.GITHUB_BASE_REF || 'main';
    const changedFiles = execSync(
      `git diff --name-only ${baseBranch}...HEAD 2>/dev/null || git diff --name-only HEAD~1`,
      { encoding: 'utf-8', timeout: 10000 },
    );

    return changedFiles.includes('docs/future-history/');
  } catch {
    return false;
  }
}

// Main check logic
function runCheck(): CheckResult {
  const stats = getPRStats();

  if (!stats) {
    return {
      pass: true,
      reason: 'Could not determine PR stats - skipping check',
    };
  }

  const totalLines = stats.additions + stats.deletions;
  console.log(`\n📊 PR Stats:`);
  console.log(
    `   Lines changed: ${totalLines} (+${stats.additions}/-${stats.deletions})`,
  );
  console.log(`   Files changed: ${stats.changedFiles}`);
  console.log(
    `   Labels: ${stats.labels.length > 0 ? stats.labels.join(', ') : 'none'}`,
  );
  console.log(
    `   Thresholds: ${CONFIG.linesThreshold} lines, ${CONFIG.filesThreshold} files\n`,
  );

  // Check for skip marker
  if (hasSkipMarker(stats)) {
    return {
      pass: true,
      reason: `Skip marker [fh-skip] found - Future History check bypassed`,
    };
  }

  // Check if PR changes Future History files (self-referential pass)
  if (changesFutureHistory()) {
    return {
      pass: true,
      reason: 'PR includes Future History changes',
    };
  }

  // Determine if check is needed
  const isLargePR = exceedsThresholds(stats);
  const isEpicPR = hasEpicLabels(stats);
  const needsEntry = isLargePR || isEpicPR;

  if (!needsEntry) {
    return {
      pass: true,
      reason: `PR below thresholds (${totalLines} lines, ${stats.changedFiles} files) - no Future History entry required`,
    };
  }

  // Check for existing entry
  if (hasFutureHistoryEntry(stats)) {
    return {
      pass: true,
      reason: 'Future History entry found for this PR',
    };
  }

  // Entry required but missing
  const triggerReason = isEpicPR
    ? `epic-level labels (${stats.labels.filter((l) => CONFIG.epicLabels.some((e) => l.toLowerCase().includes(e))).join(', ')})`
    : `large PR (${totalLines} lines, ${stats.changedFiles} files)`;

  return {
    pass: false,
    reason: `Future History entry recommended due to ${triggerReason}`,
    suggestion: `
To add a Future History entry:
  1. Run: pnpm future-history:create --pr ${stats.number || 'PR_NUMBER'} --summary "Your change summary"
  2. Fill in the placeholders in docs/future-history/LOG.md
  3. Or add [fh-skip] to PR description with justification to bypass

Why Future History?
  - Chronicles major decisions for strategy, investors, and auditors
  - Captures expected outcomes for retrospective validation
  - Provides context for future engineers

Learn more: docs/future-history/template.md
`,
  };
}

// Output formatting
function formatOutput(result: CheckResult): void {
  if (result.pass) {
    console.log(`✅ Future History Check: PASS`);
    console.log(`   ${result.reason}`);
  } else {
    const icon = CONFIG.strict ? '❌' : '⚠️';
    const status = CONFIG.strict ? 'FAIL' : 'WARN';
    console.log(`${icon} Future History Check: ${status}`);
    console.log(`   ${result.reason}`);
    if (result.suggestion) {
      console.log(result.suggestion);
    }
  }
}

// GitHub Actions annotation
function annotateGitHub(result: CheckResult): void {
  if (process.env.GITHUB_ACTIONS !== 'true') {
    return;
  }

  if (!result.pass) {
    const level = CONFIG.strict ? 'error' : 'warning';
    console.log(
      `::${level}::Future History entry recommended for this PR. ${result.reason}`,
    );
  }
}

// Main execution
function main(): void {
  console.log('🔍 Future History Coverage Check\n');
  console.log(
    `   Mode: ${CONFIG.strict ? 'Strict (blocking)' : 'Advisory (non-blocking)'}`,
  );

  const result = runCheck();

  formatOutput(result);
  annotateGitHub(result);

  if (!result.pass && CONFIG.strict) {
    process.exit(1);
  }

  process.exit(0);
}

main();
