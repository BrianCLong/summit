#!/usr/bin/env npx tsx
/**
 * Local test script for the issue sweeper using mock data
 *
 * Usage:
 *   npx tsx tools/issue-sweeper/test-local.ts
 */

import { processIssue, resultToLedgerEntry } from './lib/processor.js';
import { GitHubClient } from './lib/github.js';
import { mockIssues } from './lib/mock-data.js';
import { appendLedger, updateStats, loadState, saveState } from './lib/state.js';
import { generateReport } from './lib/reporter.js';

console.log(`
╔════════════════════════════════════════════════════════════════╗
║           ISSUE SWEEPER - LOCAL TEST MODE                      ║
╚════════════════════════════════════════════════════════════════╝

Testing with ${mockIssues.length} mock issues...
`);

async function testLocal() {
  // Note: GitHub client won't be used in mock mode, but we still create it
  const githubClient = new GitHubClient();
  const state = loadState();

  console.log(`📊 Initial State:`);
  console.log(`   - Total Processed: ${state.total_processed}`);
  console.log(``);

  for (const issue of mockIssues) {
    try {
      console.log(`\n${'─'.repeat(70)}`);

      // Process issue (but skip GitHub API calls)
      const result = await processIssueWithoutAPI(issue, githubClient);

      // Save to ledger
      const ledgerEntry = resultToLedgerEntry(result);
      appendLedger(ledgerEntry);

      // Update statistics
      updateStats(state, ledgerEntry);

      console.log(`   ✅ Processed successfully`);
    } catch (error) {
      console.error(`   ❌ Error:`, error);
    }
  }

  // Save final state
  saveState(state);
  generateReport(state);

  console.log(`\n${'='.repeat(70)}`);
  console.log(`📈 FINAL STATISTICS`);
  console.log(`${'='.repeat(70)}`);
  console.log(`Total Processed: ${state.total_processed}`);
  console.log(`Already Solved: ${state.stats.already_solved}`);
  console.log(`Solved in This Run: ${state.stats.solved_in_this_run}`);
  console.log(`Not Solved: ${state.stats.not_solved}`);
  console.log(`Blocked: ${state.stats.blocked}`);
  console.log(`Duplicate: ${state.stats.duplicate}`);
  console.log(`Invalid: ${state.stats.invalid}`);
  console.log(``);
  console.log(`✅ Test complete! Check LEDGER.ndjson and REPORT.md`);
  console.log(``);
}

/**
 * Process issue without making GitHub API calls
 */
async function processIssueWithoutAPI(issue: any, githubClient: any) {
  const { classifyIssue } = await import('./lib/classifier.js');

  console.log(`📋 Processing issue #${issue.number}: ${issue.title}`);

  const classification = classifyIssue(issue);
  console.log(`   Classification: ${classification}`);

  // Simulate evidence search without API
  let solved_status: any;
  let evidence: any = {
    commits: [],
    prs: [],
    notes: '',
  };
  const actions: string[] = [];

  // Mock decision logic
  if (classification === 'question') {
    solved_status = 'blocked';
    evidence.notes = 'Requires clarification from reporter.';
    console.log(`   ⏸️  Blocked: Question requires clarification`);
  } else if (classification === 'security') {
    solved_status = 'blocked';
    evidence.notes = 'Security issue requires careful review.';
    console.log(`   🔐 Blocked: Security issue`);
  } else {
    solved_status = 'not_solved';
    evidence.notes = 'Identified as actionable (mock mode).';
    console.log(`   📝 Not solved: Requires implementation`);
  }

  return {
    issue,
    classification,
    solved_status,
    evidence,
    actions,
  };
}

testLocal().catch((error) => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});
