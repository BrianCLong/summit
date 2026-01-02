#!/usr/bin/env node
/**
 * Issue Sweeper - Automated issue analysis and tracking for Summit repository
 */

import { Command } from 'commander';
import { pino } from 'pino';
import { exec } from 'child_process';
import { promisify } from 'util';
import { GitHubClient } from './github.js';
import { Ledger } from './ledger.js';
import { Reporter } from './report.js';
import { detectAlreadySolved, determineVerification } from './detect.js';
import type { CLIConfig, LedgerEntry, BatchResult } from './types.js';

const execAsync = promisify(exec);

/**
 * Get GitHub token from environment or gh CLI
 */
async function getGitHubToken(): Promise<string> {
  // Try environment variable first
  if (process.env.GITHUB_TOKEN) {
    return process.env.GITHUB_TOKEN;
  }

  // Try gh CLI
  try {
    const { stdout } = await execAsync('gh auth token');
    const token = stdout.trim();
    if (token) {
      return token;
    }
  } catch (error) {
    // gh CLI not available or not authenticated
  }

  throw new Error(
    'GitHub token not found. Set GITHUB_TOKEN environment variable or authenticate with: gh auth login'
  );
}

/**
 * Generate a unique run ID
 */
function generateRunId(): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  return `run-${timestamp}`;
}

/**
 * Main run function
 */
async function run(config: CLIConfig) {
  const logger = pino({
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        ignore: 'pid,hostname',
        translateTime: 'HH:MM:ss',
      },
    },
  });

  logger.info('🚀 Issue Sweeper starting...');
  logger.info(`Repository: ${config.repo}`);
  logger.info(`Batch size: ${config.batchSize}`);
  logger.info(`State filter: ${config.state}`);
  logger.info(`Dry run: ${config.dryRun}`);

  // Get GitHub token
  let token: string;
  try {
    token = await getGitHubToken();
    logger.info('✓ GitHub authentication configured');
  } catch (error: any) {
    logger.error(error.message);
    process.exit(1);
  }

  // Initialize components
  const githubClient = new GitHubClient({ token, repo: config.repo, logger });
  const baseDir = process.cwd();
  const ledger = new Ledger(baseDir, logger);
  const reporter = new Reporter(`${baseDir}/REPORT.md`, logger);

  await ledger.initialize();

  // Handle reset flags
  if (config.resetLedger) {
    if (!config.iUnderstand) {
      logger.error('❌ --reset-ledger requires --i-understand flag for confirmation');
      process.exit(1);
    }
    logger.warn('⚠️  Resetting ledger...');
    await ledger.resetLedger();
  }

  if (config.reset) {
    logger.warn('⚠️  Resetting state...');
    await ledger.resetState();
  }

  // Load or create run state
  const runId = generateRunId();
  let state = await ledger.loadState({
    repo: config.repo,
    stateFilter: config.state,
    batchSize: config.batchSize,
    runId,
  });

  // Initialize report
  await reporter.initialize(state.run_id, config.repo);

  logger.info(`Run ID: ${state.run_id}`);
  logger.info(`Starting from: ${state.last_processed_issue_number || 'beginning'}`);

  // Main processing loop
  let batchNumber = 1;
  let totalProcessed = state.processed_count;
  let currentPage = 1;
  let hasMore = true;

  while (hasMore) {
    logger.info(`\n📦 Batch ${batchNumber} (page ${currentPage})`);

    // Fetch issues
    let issues;
    try {
      const result = await githubClient.fetchIssues({
        state: config.state,
        since: config.since,
        perPage: config.batchSize,
        page: currentPage,
      });

      issues = result.data;
      hasMore = result.nextCursor !== null && issues.length > 0;

      if (result.rateLimit) {
        logger.info(
          `Rate limit: ${result.rateLimit.remaining}/${result.rateLimit.limit} remaining`
        );
      }
    } catch (error: any) {
      logger.error(`Failed to fetch issues: ${error.message}`);
      state.error_count++;
      state.failures.push({
        issue_number: 0,
        step: 'fetch',
        error: error.message,
        timestamp: new Date().toISOString(),
      });
      await ledger.saveState(state);
      break;
    }

    if (issues.length === 0) {
      logger.info('No more issues to process');
      break;
    }

    logger.info(`Found ${issues.length} issues in this batch`);

    // Process each issue
    const batchEntries: LedgerEntry[] = [];
    const batchResult: BatchResult = {
      issuesProcessed: 0,
      alreadySolved: 0,
      notSolved: 0,
      blocked: 0,
      duplicate: 0,
      invalid: 0,
      errors: 0,
    };

    for (const issue of issues) {
      try {
        // Check if already processed (idempotency)
        const existing = await ledger.getEntry(issue.number);
        if (existing && !config.reset) {
          logger.debug(`Issue #${issue.number} already processed, skipping`);
          continue;
        }

        logger.info(`Processing issue #${issue.number}: ${issue.title}`);

        // Detect if already solved
        const detection = await detectAlreadySolved(issue, githubClient, logger);

        // Create ledger entry
        const entry: LedgerEntry = {
          issue_number: issue.number,
          title: issue.title,
          url: issue.html_url,
          state: issue.state,
          labels: issue.labels.map((l) => l.name),
          updatedAt: issue.updated_at,
          createdAt: issue.created_at,
          classification: detection.classification,
          solved_status: detection.solved_status,
          evidence: detection.evidence,
          actions_taken: [],
          verification: determineVerification(issue, detection.classification),
          notes: detection.notes,
          run_id: state.run_id,
          processed_at: new Date().toISOString(),
        };

        // Save to ledger
        await ledger.saveEntry(entry);
        batchEntries.push(entry);

        // Update batch stats
        batchResult.issuesProcessed++;
        switch (detection.solved_status) {
          case 'already_solved':
            batchResult.alreadySolved++;
            break;
          case 'not_solved':
            batchResult.notSolved++;
            break;
          case 'blocked':
            batchResult.blocked++;
            break;
          case 'duplicate':
            batchResult.duplicate++;
            break;
          case 'invalid':
            batchResult.invalid++;
            break;
        }

        // Update state
        state.last_processed_issue_number = issue.number;
        totalProcessed++;

        logger.info(
          `  → ${detection.solved_status} (${detection.classification}) - ${detection.notes}`
        );
      } catch (error: any) {
        logger.error(`Error processing issue #${issue.number}: ${error.message}`);
        batchResult.errors++;
        state.error_count++;
        state.failures.push({
          issue_number: issue.number,
          step: 'process',
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Update state
    state.processed_count = totalProcessed;
    await ledger.saveState(state);

    // Generate NDJSON
    await ledger.generateNDJSON();

    // Update report
    const issueRange = {
      start: issues[issues.length - 1]?.number || 0,
      end: issues[0]?.number || 0,
    };
    await reporter.appendBatch(batchNumber, issueRange, batchResult, batchEntries);

    logger.info(`✓ Batch ${batchNumber} complete:`);
    logger.info(`  Already solved: ${batchResult.alreadySolved}`);
    logger.info(`  Not solved: ${batchResult.notSolved}`);
    logger.info(`  Blocked: ${batchResult.blocked}`);
    logger.info(`  Duplicate: ${batchResult.duplicate}`);
    logger.info(`  Invalid: ${batchResult.invalid}`);
    logger.info(`  Errors: ${batchResult.errors}`);

    // Check if we've hit max issues limit
    if (config.maxIssues && totalProcessed >= config.maxIssues) {
      logger.info(`Reached max issues limit: ${config.maxIssues}`);
      break;
    }

    batchNumber++;
    currentPage++;

    // Small delay between batches to be nice to the API
    if (hasMore) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  // Generate final summary
  const allEntries = await ledger.loadAllEntries();
  await reporter.generateSummary(state, allEntries);

  const stats = await ledger.getStats();

  logger.info('\n✅ Issue Sweeper complete!');
  logger.info(`Total issues processed: ${totalProcessed}`);
  logger.info(`Already solved: ${stats.bySolvedStatus.already_solved || 0}`);
  logger.info(`Not solved: ${stats.bySolvedStatus.not_solved || 0}`);
  logger.info(`Total errors: ${state.error_count}`);

  const size = await ledger.getSize();
  logger.info(`Ledger size: ${size.files} files, ${(size.bytes / 1024).toFixed(2)} KB`);

  logger.info('\n📊 Reports generated:');
  logger.info(`  - STATE.json`);
  logger.info(`  - LEDGER.ndjson`);
  logger.info(`  - REPORT.md`);
}

/**
 * CLI setup
 */
const program = new Command();

program
  .name('issue-sweeper')
  .description('Automated issue sweeper for Summit repository')
  .version('1.0.0')
  .option('--repo <repo>', 'Repository in owner/repo format', 'BrianCLong/summit')
  .option('--batch-size <size>', 'Number of issues per batch', '50')
  .option('--state <state>', 'Issue state filter: all|open|closed', 'all')
  .option('--since <date>', 'Filter issues updated since ISO date')
  .option('--max-issues <n>', 'Maximum number of issues to process')
  .option('--dry-run', 'Dry run mode (no GitHub writes)', true)
  .option('--write-comments', 'Enable posting comments on already-solved issues', false)
  .option('--open-prs', 'Enable creating PRs for fixes', false)
  .option('--resume', 'Resume from last state', true)
  .option('--no-resume', 'Start fresh (ignores state)')
  .option('--reset', 'Reset state file', false)
  .option('--reset-ledger', 'Reset ledger (dangerous)', false)
  .option('--i-understand', 'Confirmation flag for dangerous operations', false)
  .action(async (options) => {
    const config: CLIConfig = {
      repo: options.repo,
      batchSize: parseInt(options.batchSize, 10),
      state: options.state as 'all' | 'open' | 'closed',
      since: options.since,
      maxIssues: options.maxIssues ? parseInt(options.maxIssues, 10) : undefined,
      dryRun: options.dryRun,
      writeComments: options.writeComments,
      openPrs: options.openPrs,
      resume: options.resume,
      reset: options.reset,
      resetLedger: options.resetLedger,
      iUnderstand: options.iUnderstand,
    };

    try {
      await run(config);
    } catch (error: any) {
      console.error('Fatal error:', error.message);
      console.error(error.stack);
      process.exit(1);
    }
  });

program.parse();
