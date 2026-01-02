/**
 * Report generation
 */

import { writeFileSync } from 'fs';
import { join } from 'path';
import { State, LedgerEntry } from './types.js';
import { readLedger } from './state.js';

const REPORT_FILE = join(process.cwd(), 'tools/issue-sweeper/REPORT.md');

/**
 * Generate and save the report
 */
export function generateReport(state: State): void {
  const ledger = readLedger();
  const now = new Date().toISOString();

  const report = `# Issue Sweeper Report

**Generated:** ${now}
**Started:** ${state.run_started_at || 'N/A'}
**Last Updated:** ${state.run_updated_at || 'N/A'}

## Summary

Processed ${state.total_processed} issues across ${Math.ceil(state.total_processed / state.batch_size)} batches.

## Statistics

- **Already Solved:** ${state.stats.already_solved}
- **Solved in This Run:** ${state.stats.solved_in_this_run}
- **Not Solved:** ${state.stats.not_solved}
- **Blocked:** ${state.stats.blocked}
- **Duplicate:** ${state.stats.duplicate}
- **Invalid:** ${state.stats.invalid}

## Progress

- **Cursor:** Page ${state.cursor}
- **Last Issue:** #${state.last_issue_number}
- **Batch Size:** ${state.batch_size}

## PRs Opened

${state.open_prs.length > 0 ? state.open_prs.map((pr) => `- ${pr}`).join('\n') : 'None yet.'}

## Recent Failures

${state.failures.length > 0 ? state.failures.slice(-10).map((f) => `- Issue #${f.issue}: ${f.reason}`).join('\n') : 'None'}

## Top Recurring Themes

${analyzeRecurringThemes(ledger)}

## Classification Breakdown

${analyzeClassifications(ledger)}

## Next Steps

${state.cursor === 1 && state.total_processed === 0 ? '- Run the sweeper to start processing issues' : '- Continue processing remaining issues'}
- Review blocked issues and provide required input
- Monitor CI for open PRs
- Address any failures listed above
`;

  writeFileSync(REPORT_FILE, report, 'utf-8');
}

/**
 * Analyze recurring themes in issues
 */
function analyzeRecurringThemes(ledger: LedgerEntry[]): string {
  if (ledger.length === 0) {
    return 'No data yet.';
  }

  const themes: Record<string, number> = {};

  for (const entry of ledger) {
    const key = entry.classification;
    themes[key] = (themes[key] || 0) + 1;
  }

  const sorted = Object.entries(themes).sort((a, b) => b[1] - a[1]);

  return sorted.map(([theme, count]) => `- **${theme}**: ${count} issues`).join('\n');
}

/**
 * Analyze classification breakdown
 */
function analyzeClassifications(ledger: LedgerEntry[]): string {
  if (ledger.length === 0) {
    return 'No data yet.';
  }

  const classifications: Record<string, number> = {};

  for (const entry of ledger) {
    const key = `${entry.classification} (${entry.solved_status})`;
    classifications[key] = (classifications[key] || 0) + 1;
  }

  const sorted = Object.entries(classifications).sort((a, b) => b[1] - a[1]);

  return sorted.map(([classification, count]) => `- ${classification}: ${count}`).join('\n');
}
