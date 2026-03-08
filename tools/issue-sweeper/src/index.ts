#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { GitHubClient, getAuthToken } from './github.js';
import { promises as fs } from 'fs';
import path from 'path';
import { detectAlreadySolved, SolvedStatus } from './detect.js';
import { writeLedgerEntry } from './ledger.js';
import { appendToReport, initReport, BatchSummary } from './report.js';
import { randomUUID } from 'crypto';
import { loadState, saveState } from './state.js';

const STATE_FILE = path.join('tools', 'issue-sweeper', 'STATE.json');
const LEDGER_DIR = path.join('tools', 'issue-sweeper', 'ledger');

async function main() {
  const argv = await yargs(hideBin(process.argv))
    .option('repo', {
      type: 'string',
      description: 'The GitHub repository to process',
      default: 'BrianCLong/summit',
    })
    .option('batch-size', {
      type: 'number',
      description: 'The number of issues to process in a batch',
      default: 50,
    })
    .option('state', {
      type: 'string',
      description: 'The state of issues to fetch',
      choices: ['all', 'open', 'closed'],
      default: 'all',
    })
    .option('since', {
      type: 'string',
      description: 'Optional ISO date to filter issues by updatedAt',
    })
    .option('max-issues', {
        type: 'number',
        description: 'Optional max number of issues to process for smoke runs',
    })
    .option('dry-run', {
      type: 'boolean',
      description: 'Do not perform any write actions to GitHub',
      default: true,
    })
    .option('write-comments', {
        type: 'boolean',
        description: 'Enable posting "already solved" comments',
        default: false,
    })
    .option('open-prs', {
        type: 'boolean',
        description: 'Enable creating branches/PRs',
        default: false,
    })
    .option('resume', {
        type: 'boolean',
        description: 'Resume from the last processed issue',
        default: true,
    })
    .option('reset', {
        type: 'boolean',
        description: 'Clears STATE but not LEDGER',
        default: false,
    })
    .option('reset-ledger', {
        type: 'boolean',
        description: 'DANGEROUS: Clears the entire ledger. Requires --i-understand',
        default: false,
    })
    .option('i-understand', {
        type: 'boolean',
        description: 'Confirmation for dangerous operations',
        default: false,
    })
    .help()
    .argv;

  console.log('Issue Sweeper Runner');
  
  if (argv.resetLedger && !argv.iUnderstand) {
    console.error('ERROR: --reset-ledger is a dangerous operation. You must provide --i-understand to confirm.');
    process.exit(1);
  }

  if (argv.resetLedger) {
    console.log('Resetting ledger...');
    await fs.rm(LEDGER_DIR, { recursive: true, force: true });
    await fs.mkdir(LEDGER_DIR, { recursive: true });
  }

  await initReport();

  const authToken = getAuthToken();
  const githubClient = new GitHubClient({ repo: argv.repo, auth: authToken });
  const state = await loadState(
    STATE_FILE,
    argv.repo,
    argv.state,
    argv.batchSize,
    argv.reset,
  );
  const runId = randomUUID();

  let issuesProcessedInRun = 0;

  while (true) {
    console.log(`Fetching page ${state.cursor.page}...`);
    const issues = await githubClient.getIssues(argv.state, argv.since, argv.batchSize, state.cursor.page);

    if (issues.length === 0) {
        console.log('No more issues found.');
        break;
    }

    const batchSummary: BatchSummary = {
        batch_range: `${issues[0].number} - ${issues[issues.length - 1].number}`,
        counts: {
            already_solved: 0,
            not_solved: 0,
            blocked: 0,
            duplicate: 0,
            invalid: 0,
            solved_in_this_run: 0,
        },
        prs_opened: [],
        failures: [],
    };

    for (const issue of issues) {
        if (argv.maxIssues && issuesProcessedInRun >= argv.maxIssues) {
            console.log(`Reached max issues limit of ${argv.maxIssues}.`);
            break;
        }
        
        const detectionResult = await detectAlreadySolved(issue, githubClient);
        batchSummary.counts[detectionResult.solved_status]++;
        
        console.log(`  [${detectionResult.solved_status}] Processing issue #${issue.number}: ${issue.title}`);

        await writeLedgerEntry(issue, detectionResult, runId);

        state.processed_count++;
        issuesProcessedInRun++;
    }

    await appendToReport(batchSummary);

    if (argv.maxIssues && issuesProcessedInRun >= argv.maxIssues) {
        break;
    }

    state.cursor.page++;
    await saveState(STATE_FILE, state);

    if (issues.length < argv.batchSize) {
        console.log('All issues processed.');
        break;
    }
  }

  await saveState(STATE_FILE, state);
  console.log('Run complete.');
}

main().catch(console.error);
