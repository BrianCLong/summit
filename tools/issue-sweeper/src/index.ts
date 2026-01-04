import { Command } from 'commander';
import { GitHubClient } from './github';
import { Ledger, State, LedgerEntry, IssueClassification, SolvedStatus } from './ledger';
import { Reporter } from './report';
import { detectAlreadySolved } from './detect';
import path from 'path';
import { randomUUID } from 'crypto';

const program = new Command();

interface CLIOptions {
  repo: string;
  batchSize: number;
  state: 'all' | 'open' | 'closed';
  since?: string;
  maxIssues?: number;
  dryRun: boolean;
  writeComments: boolean;
  openPrs: boolean;
  resume: boolean;
  reset: boolean;
  resetLedger: boolean;
  iUnderstand: boolean;
}

const TOOLS_DIR = path.resolve(__dirname, '..'); // tools/issue-sweeper

program
  .option('--repo <owner/repo>', 'The target GitHub repository', 'BrianCLong/summit')
  .option('--batch-size <N>', 'Number of issues to process in each batch', String(50))
  .option('--state <all|open|closed>', 'Filter issues by state', 'all')
  .option('--since <ISO date>', 'Only process issues updated after this date')
  .option('--max-issues <N>', 'Maximum number of issues to process', (value) => parseInt(value, 10))
  .option('--dry-run', 'If true, no comments, PRs, or closes will be made on GitHub', true)
  .option('--write-comments', 'Enable posting "already solved" comments on GitHub issues', false)
  .option('--open-prs', 'Enable creating branches and opening PRs for fixes', false)
  .option('--resume', 'Resume from the last checkpoint in STATE.json', true)
  .option('--reset', 'Clear STATE.json before starting a new run', false)
  .option('--reset-ledger', 'Clear LEDGER.ndjson and STATE.json', false)
  .option('--i-understand', 'Confirmation flag for dangerous operations like --reset-ledger', false)
  .action(async (options: CLIOptions) => {
    const {
      repo,
      batchSize: batchSizeStr,
      state,
      since,
      maxIssues,
      dryRun,
      writeComments,
      openPrs,
      resume,
      reset,
      resetLedger,
      iUnderstand,
    } = options;

    const batchSize = parseInt(batchSizeStr, 10);

    if (resetLedger && !iUnderstand) {
      console.error('Error: --reset-ledger requires --i-understand flag for confirmation.');
      process.exit(1);
    }

    const github = new GitHubClient(repo);
    const ledger = new Ledger(TOOLS_DIR);
    const reporter = new Reporter(TOOLS_DIR);

    let currentRunId = randomUUID();

    // Handle reset flags
    if (resetLedger) {
      await ledger.resetLedger();
      await ledger.resetState(); // Reset state as well if ledger is reset
      await reporter.initializeReport();
      console.log('Ledger and State have been reset.');
    } else if (reset) {
      await ledger.resetState();
      console.log('State has been reset.');
    }

    let appState: State = {
      repo,
      state_filter: state,
      batch_size: batchSize,
      cursor: 1, // Start page for GitHub API
      last_processed_issue_number: 0,
      run_started_at: new Date().toISOString(),
      run_updated_at: new Date().toISOString(),
      processed_count: 0,
      error_count: 0,
      failures: [],
      open_prs: [],
    };

    if (resume && !reset && !resetLedger) {
      const loadedState = await ledger.loadState();
      if (loadedState) {
        appState = loadedState;
        console.log('Resuming from previous state:', appState);
        // Ensure run_started_at is preserved from the original run
        appState.run_updated_at = new Date().toISOString();
        currentRunId = randomUUID(); // New run ID for this session
      } else {
        console.log('No previous state found, starting a new run.');
        await reporter.initializeReport();
      }
    } else {
      console.log('Starting a new run (or reset was requested).');
      await reporter.initializeReport();
    }

    await ledger.loadLedger(); // Load existing ledger entries for idempotency checks

    let page = typeof appState.cursor === 'number' ? appState.cursor : 1;
    let totalIssuesProcessedInRun = 0;
    let batchNumber = 0;

    while (true) {
      batchNumber++;
      console.log(`\n--- Processing Batch #${batchNumber}, Page ${page} ---`);
      let issues;
      try {
        issues = await github.getIssues(state, batchSize, page, since);
        if (maxIssues && totalIssuesProcessedInRun + issues.length > maxIssues) {
          issues = issues.slice(0, maxIssues - totalIssuesProcessedInRun);
        }
      } catch (error) {
        console.error(`Failed to fetch issues for page ${page}:`, error);
        appState.error_count++;
        appState.failures.push({
          issue_number: 0, // No specific issue number for fetch failure
          step: `fetch_issues_page_${page}`,
          error_message: (error as Error).message,
          timestamp: new Date().toISOString(),
        });
        await ledger.saveState(appState);
        break; // Stop processing on fetch error
      }

      if (issues.length === 0) {
        console.log('No more issues to process.');
        break;
      }

      const processedEntriesInBatch: LedgerEntry[] = [];
      for (const issue of issues) {
        if (ledger.getLedgerEntry(issue.number)) {
          console.log(`Issue #${issue.number} already in ledger, skipping.`);
          appState.processed_count++;
          totalIssuesProcessedInRun++;
          continue;
        }

        console.log(`Processing issue #${issue.number}: ${issue.title}`);

        let classification: IssueClassification = 'unknown'; // TODO: Implement classification logic
        let solvedStatus: SolvedStatus = 'not_solved';
        let evidence: LedgerEntry['evidence'] = { prs: [], commits: [], paths: [], tests: [] };
        let notes = '';
        const actionsTaken: string[] = [];
        const verification: string[] = [];

        try {
          const detectionResult = await detectAlreadySolved(issue.number, issue.title, github);
          solvedStatus = detectionResult.status;
          evidence = detectionResult.evidence;
          notes = detectionResult.notes;

          if (solvedStatus === 'already_solved' && writeComments && !dryRun) {
            const commentBody = `This issue appears to be already solved. Evidence: ${JSON.stringify(evidence.prs.map(p => p.url))}. Verification: ${notes}`;
            await github.addIssueComment(issue.number, commentBody);
            actionsTaken.push('commented_already_solved');
            console.log(`Commented on issue #${issue.number} about being already solved.`);
          }
        } catch (error) {
          console.error(`Error detecting solved status for issue #${issue.number}:`, error);
          appState.error_count++;
          appState.failures.push({
            issue_number: issue.number,
            step: 'detect_already_solved',
            error_message: (error as Error).message,
            timestamp: new Date().toISOString(),
          });
          solvedStatus = 'blocked';
          notes += `Error during detection: ${(error as Error).message}`;
        }

        const ledgerEntry: LedgerEntry = {
          issue_number: issue.number,
          title: issue.title,
          url: issue.url,
          state: issue.state,
          labels: issue.labels.map(label => label.name),
          updatedAt: issue.updatedAt,
          createdAt: issue.createdAt,
          classification,
          solved_status: solvedStatus,
          evidence,
          actions_taken: actionsTaken,
          verification,
          notes,
          run_id: currentRunId,
        };

        await ledger.appendLedgerEntry(ledgerEntry);
        processedEntriesInBatch.push(ledgerEntry);

        appState.last_processed_issue_number = issue.number;
        appState.processed_count++;
        totalIssuesProcessedInRun++;

        if (maxIssues && totalIssuesProcessedInRun >= maxIssues) {
          console.log(`Reached maximum issues to process (${maxIssues}). Stopping.`);
          break;
        }
      }

      // Update state after each batch
      appState.cursor = page + 1;
      appState.run_updated_at = new Date().toISOString();
      await ledger.saveState(appState);

      // Generate report for the batch
      await reporter.appendBatchReport(batchNumber, processedEntriesInBatch, appState.open_prs);

      if (maxIssues && totalIssuesProcessedInRun >= maxIssues) {
        break;
      }
      page++;
    }

    console.log('\n--- Issue Sweeper Run Complete ---');
    console.log('Final State:', appState);
  });

program.parse(process.argv);
