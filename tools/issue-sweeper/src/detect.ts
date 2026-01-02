/**
 * Detection logic for determining if an issue is already solved
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import type { GitHubIssue, Evidence, SolvedStatus, IssueClassification } from './types.js';
import type { GitHubClient } from './github.js';

const execAsync = promisify(exec);

export interface DetectionResult {
  solved_status: SolvedStatus;
  classification: IssueClassification;
  evidence: Evidence;
  notes: string;
}

/**
 * Classify issue based on labels and title
 */
export function classifyIssue(issue: GitHubIssue): IssueClassification {
  const labels = issue.labels.map((l) => l.name.toLowerCase());
  const title = issue.title.toLowerCase();

  // Check labels first
  if (labels.some((l) => l.includes('bug') || l.includes('fix'))) return 'bug';
  if (labels.some((l) => l.includes('security') || l.includes('vulnerability'))) return 'security';
  if (labels.some((l) => l.includes('feature') || l.includes('enhancement'))) return 'feature';
  if (labels.some((l) => l.includes('docs') || l.includes('documentation'))) return 'docs';
  if (labels.some((l) => l.includes('question') || l.includes('help'))) return 'question';
  if (labels.some((l) => l.includes('ci') || l.includes('build') || l.includes('test'))) return 'ci';
  if (labels.some((l) => l.includes('perf') || l.includes('performance'))) return 'perf';
  if (labels.some((l) => l.includes('refactor') || l.includes('cleanup'))) return 'refactor';

  // Check title
  if (title.includes('bug') || title.includes('fix') || title.includes('error')) return 'bug';
  if (title.includes('security') || title.includes('vulnerability')) return 'security';
  if (title.includes('feature') || title.includes('add') || title.includes('implement')) return 'feature';
  if (title.includes('docs') || title.includes('documentation')) return 'docs';
  if (title.includes('question') || title.includes('how to')) return 'question';
  if (title.includes('ci') || title.includes('build') || title.includes('test')) return 'ci';
  if (title.includes('performance') || title.includes('slow') || title.includes('perf')) return 'perf';
  if (title.includes('refactor') || title.includes('cleanup')) return 'refactor';

  return 'unknown';
}

/**
 * Detect if an issue is already solved
 */
export async function detectAlreadySolved(
  issue: GitHubIssue,
  githubClient: GitHubClient,
  logger?: any
): Promise<DetectionResult> {
  const log = logger || console;
  const evidence: Evidence = {
    prs: [],
    commits: [],
    paths: [],
    tests: [],
  };

  let notes = '';
  let solved_status: SolvedStatus = 'not_solved';

  try {
    // 1. Search for PRs referencing this issue
    log.info(`Searching PRs for issue #${issue.number}`);
    const prs = await githubClient.searchPRsForIssue(issue.number);

    for (const pr of prs) {
      evidence.prs.push({
        number: pr.number,
        url: pr.html_url,
        mergedAt: pr.merged_at,
        title: pr.title,
      });
    }

    // 2. Check if any PRs were merged
    const mergedPRs = evidence.prs.filter((pr) => pr.mergedAt !== null);

    if (mergedPRs.length > 0) {
      solved_status = 'already_solved';
      notes = `Found ${mergedPRs.length} merged PR(s) referencing this issue: ${mergedPRs
        .map((pr) => `#${pr.number}`)
        .join(', ')}`;
      log.info(`Issue #${issue.number}: ${notes}`);
      return {
        solved_status,
        classification: classifyIssue(issue),
        evidence,
        notes,
      };
    }

    // 3. Search commits for references (best effort via git log)
    try {
      log.info(`Searching commits for issue #${issue.number}`);
      const commits = await searchGitCommits(issue.number, log);

      for (const commit of commits) {
        evidence.commits.push(commit);
      }

      if (evidence.commits.length > 0) {
        solved_status = 'already_solved';
        notes = `Found ${evidence.commits.length} commit(s) referencing this issue: ${evidence.commits
          .map((c) => c.sha.substring(0, 7))
          .join(', ')}`;
        log.info(`Issue #${issue.number}: ${notes}`);
        return {
          solved_status,
          classification: classifyIssue(issue),
          evidence,
          notes,
        };
      }
    } catch (error: any) {
      log.warn(`Failed to search git commits for issue #${issue.number}: ${error.message}`);
    }

    // 4. Check if issue is closed with specific labels
    if (issue.state === 'closed') {
      const labels = issue.labels.map((l) => l.name.toLowerCase());

      if (labels.some((l) => l.includes('duplicate'))) {
        solved_status = 'duplicate';
        notes = 'Closed as duplicate';
      } else if (labels.some((l) => l.includes('invalid') || l.includes('wontfix') || l.includes("won't fix"))) {
        solved_status = 'invalid';
        notes = 'Closed as invalid/wontfix';
      } else if (labels.some((l) => l.includes('blocked') || l.includes('waiting'))) {
        solved_status = 'blocked';
        notes = 'Marked as blocked';
      } else if (evidence.prs.length > 0) {
        // Has PRs but none merged - weak evidence
        solved_status = 'not_solved';
        notes = `Closed but no merged PRs found. Has ${evidence.prs.length} unmerged PR(s)`;
      } else {
        // Closed but no evidence of resolution
        solved_status = 'not_solved';
        notes = 'Closed but no clear evidence of resolution';
      }
    } else {
      // Open issue with no evidence
      solved_status = 'not_solved';
      notes = 'Open issue with no evidence of resolution';
    }
  } catch (error: any) {
    log.error(`Error detecting solution for issue #${issue.number}: ${error.message}`);
    notes = `Detection error: ${error.message}`;
  }

  return {
    solved_status,
    classification: classifyIssue(issue),
    evidence,
    notes,
  };
}

/**
 * Search git log for commits referencing an issue
 */
async function searchGitCommits(
  issueNumber: number,
  logger: any
): Promise<Array<{ sha: string; url: string; message: string }>> {
  try {
    // Search git log for references to the issue number
    const { stdout } = await execAsync(
      `git log --all --grep="#${issueNumber}" --format="%H|||%s" -n 20`,
      { cwd: process.cwd() }
    );

    if (!stdout.trim()) {
      return [];
    }

    const commits = stdout
      .trim()
      .split('\n')
      .map((line) => {
        const [sha, ...messageParts] = line.split('|||');
        const message = messageParts.join('|||');
        return {
          sha: sha.trim(),
          url: `https://github.com/BrianCLong/summit/commit/${sha.trim()}`,
          message: message.trim(),
        };
      })
      .filter((c) => c.sha && c.message);

    return commits;
  } catch (error: any) {
    // If git command fails (not a git repo, etc), return empty
    logger.debug(`Git log search failed: ${error.message}`);
    return [];
  }
}

/**
 * Determine verification steps for an issue
 */
export function determineVerification(_issue: GitHubIssue, classification: IssueClassification): string[] {
  const verification: string[] = [];

  switch (classification) {
    case 'bug':
      verification.push('Reproduce the bug locally');
      verification.push('Verify fix resolves the issue');
      verification.push('Run relevant tests');
      break;

    case 'feature':
      verification.push('Test new feature functionality');
      verification.push('Verify feature requirements are met');
      verification.push('Check for edge cases');
      break;

    case 'ci':
      verification.push('Run CI pipeline');
      verification.push('Verify build succeeds');
      verification.push('Check test results');
      break;

    case 'docs':
      verification.push('Review documentation changes');
      verification.push('Verify accuracy and clarity');
      break;

    case 'security':
      verification.push('Review security implications');
      verification.push('Test security fix');
      verification.push('Verify no regressions');
      break;

    case 'perf':
      verification.push('Run performance benchmarks');
      verification.push('Compare before/after metrics');
      break;

    default:
      verification.push('Manual verification required');
  }

  return verification;
}
