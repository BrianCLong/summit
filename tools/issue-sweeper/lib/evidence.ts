/**
 * Evidence search and validation
 */

import { execSync } from 'child_process';
import { GitHubIssue, GitHubPR, Evidence } from './types.js';
import { GitHubClient } from './github.js';

/**
 * Search for evidence that an issue is already solved
 */
export async function searchForEvidence(
  issue: GitHubIssue,
  githubClient: GitHubClient
): Promise<{ isSolved: boolean; evidence: Evidence }> {
  const evidence: Evidence = {
    commits: [],
    prs: [],
    files: [],
    tests: [],
    notes: '',
  };

  // 1. Search for PRs mentioning this issue number
  try {
    const prs = await githubClient.searchPRsForIssue(issue.number);
    const mergedPRs = prs.filter((pr) => pr.merged_at !== null);

    if (mergedPRs.length > 0) {
      evidence.prs = mergedPRs.map((pr) => `#${pr.number} - ${pr.html_url}`);
      evidence.notes = `Found ${mergedPRs.length} merged PR(s) mentioning this issue.`;
      return { isSolved: true, evidence };
    }
  } catch (error) {
    console.warn(`Failed to search PRs for issue #${issue.number}:`, error);
  }

  // 2. Search git history for issue number
  try {
    const grepCmd = `git log --all --grep="#${issue.number}" --oneline -n 10`;
    const commits = execSync(grepCmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] })
      .trim()
      .split('\n')
      .filter((line) => line.length > 0);

    if (commits.length > 0) {
      evidence.commits = commits;
      evidence.notes = `Found ${commits.length} commit(s) mentioning this issue.`;
      return { isSolved: true, evidence };
    }
  } catch (error) {
    // No commits found (grep returns exit code 1 when no matches)
  }

  // 3. If issue is already closed, check if it was closed without a fix
  if (issue.state === 'closed') {
    evidence.notes = 'Issue is closed but no clear fix evidence found. May be invalid/duplicate/wontfix.';
    return { isSolved: true, evidence };
  }

  return { isSolved: false, evidence };
}

/**
 * Search codebase for file paths mentioned in issue
 */
export function extractFilePaths(issueBody: string): string[] {
  const paths: string[] = [];

  // Match common file path patterns
  const patterns = [
    /`([a-zA-Z0-9_\-\/\.]+\.(ts|js|tsx|jsx|json|yml|yaml|md))`/g,
    /\b([a-zA-Z0-9_\-\/]+\/[a-zA-Z0-9_\-\/\.]+\.(ts|js|tsx|jsx|json|yml|yaml|md))\b/g,
  ];

  for (const pattern of patterns) {
    const matches = issueBody.matchAll(pattern);
    for (const match of matches) {
      paths.push(match[1]);
    }
  }

  return Array.from(new Set(paths));
}

/**
 * Verify if a file exists in the repository
 */
export function fileExists(path: string): boolean {
  try {
    execSync(`test -f ${path}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}
