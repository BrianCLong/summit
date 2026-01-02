#!/usr/bin/env tsx
/**
 * Issue Sweeper - Main Entry Point
 *
 * Processes GitHub issues at scale with batching and checkpointing.
 *
 * Usage:
 *   tsx tools/issue-sweeper/run.ts
 *   tsx tools/issue-sweeper/run.ts --batch-size=25
 *   tsx tools/issue-sweeper/run.ts --max-batches=3
 *   tsx tools/issue-sweeper/run.ts --dry-run
 */

import { GitHubClient } from './lib/github.js';
import { processIssue, resultToLedgerEntry } from './lib/processor.js';
import { loadState, saveState, appendLedger, updateStats } from './lib/state.js';
import { generateReport } from './lib/reporter.js';
import { State } from './lib/types.js';

// Parse CLI arguments
const args = process.argv.slice(2);
const options = {
  batchSize: parseInt(args.find((a) => a.startsWith('--batch-size='))?.split('=')[1] || '50'),
  maxBatches: parseInt(args.find((a) => a.startsWith('--max-batches='))?.split('=')[1] || '0'),
  dryRun: args.includes('--dry-run'),
  autoFix: args.includes('--auto-fix'),
  autoPR: args.includes('--auto-pr'),
  skipVerification: args.includes('--skip-verification'),
};

console.log(`
╔════════════════════════════════════════════════════════════════╗
║           ISSUE SWEEPER - 10K+ Scale Processing                ║
╚════════════════════════════════════════════════════════════════╝

Configuration:
  - Batch Size: ${options.batchSize}
  - Max Batches: ${options.maxBatches || 'unlimited'}
  - Dry Run: ${options.dryRun}
  - Auto-Fix: ${options.autoFix}
  - Auto-PR: ${options.autoPR}
  - Skip Verification: ${options.skipVerification}

`);

/**
 * Main execution
 */
async function main() {
  const githubClient = new GitHubClient();
  const state = loadState();

  // Initialize run if first batch
  if (!state.run_started_at) {
    state.run_started_at = new Date().toISOString();
    state.batch_size = options.batchSize;
  }

  console.log(`📊 Current Progress:`);
  console.log(`   - Total Processed: ${state.total_processed}`);
  console.log(`   - Last Issue: #${state.last_issue_number}`);
  console.log(`   - Current Cursor: Page ${state.cursor}`);
  console.log(``);

  let batchCount = 0;

  while (true) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`📦 BATCH ${batchCount + 1} - Page ${state.cursor}`);
    console.log(`${'='.repeat(70)}`);

    try {
      // Fetch next batch of issues
      console.log(`\n🔍 Fetching issues (page ${state.cursor}, ${state.batch_size} per page)...`);
      const issues = await githubClient.fetchIssues(state.cursor, state.batch_size);

      if (issues.length === 0) {
        console.log(`\n✅ No more issues to process. Sweep complete!`);
        break;
      }

      console.log(`   Found ${issues.length} issues`);

      // Process each issue in the batch
      for (const issue of issues) {
        try {
          const result = await processIssue(issue, githubClient, {
            autoFix: options.autoFix,
            autoPR: options.autoPR,
            skipVerification: options.skipVerification,
          });

          if (!options.dryRun) {
            // Save to ledger
            const ledgerEntry = resultToLedgerEntry(result);
            appendLedger(ledgerEntry);

            // Update statistics
            updateStats(state, ledgerEntry);

            // Track PRs
            if (result.pr_url) {
              state.open_prs.push(result.pr_url);
            }
          } else {
            console.log(`   [DRY RUN] Would save ledger entry and update stats`);
          }

          // Small delay to avoid overwhelming the API
          await sleep(1000);
        } catch (error) {
          console.error(`   ❌ Error processing issue #${issue.number}:`, error);
          state.failures.push({
            issue: issue.number,
            reason: error instanceof Error ? error.message : String(error),
          });
        }
      }

      // Update cursor for next batch
      state.cursor++;

      // Save state checkpoint
      if (!options.dryRun) {
        saveState(state);
        generateReport(state);
        console.log(`\n💾 Checkpoint saved`);
      } else {
        console.log(`\n[DRY RUN] Would save state checkpoint`);
      }

      batchCount++;

      // Check if we've hit max batches limit
      if (options.maxBatches > 0 && batchCount >= options.maxBatches) {
        console.log(`\n⏸️  Reached max batches limit (${options.maxBatches}). Pausing.`);
        break;
      }

      // Small delay between batches
      await sleep(2000);
    } catch (error) {
      console.error(`\n❌ Error processing batch:`, error);

      if (error instanceof Error && error.message.includes('rate limit')) {
        console.log(`\n⏳ Rate limit hit. Waiting before retry...`);
        await sleep(60000); // Wait 1 minute
        continue;
      }

      // Save state even on error
      if (!options.dryRun) {
        saveState(state);
      }

      throw error;
    }
  }

  // Final report
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
  console.log(`Failures: ${state.failures.length}`);
  console.log(``);
  console.log(`📄 Reports generated:`);
  console.log(`   - STATE.json`);
  console.log(`   - LEDGER.ndjson`);
  console.log(`   - REPORT.md`);
  console.log(``);
}

/**
 * Helper to sleep for ms milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Run
main().catch((error) => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});
