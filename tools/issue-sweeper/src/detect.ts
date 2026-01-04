import { GitHubClient, GitHubPR } from './github';
import { LedgerEntry, SolvedStatus } from './ledger';

export async function detectAlreadySolved(
  issueNumber: number,
  issueTitle: string,
  github: GitHubClient
): Promise<{ status: SolvedStatus; evidence: LedgerEntry['evidence']; notes: string }> {
  const evidence: LedgerEntry['evidence'] = {
    prs: [],
    commits: [],
    paths: [],
    tests: [],
  };
  let notes = '';
  let status: SolvedStatus = 'not_solved';

  // 1. Search for PRs referencing the issue number
  // The GitHub search API for issues/PRs is powerful.
  // We'll search for PRs that mention the issue number in their title or body.
  const prQuery = `#${issueNumber}`;
  let prs: GitHubPR[] = [];
  try {
    prs = await github.searchPullRequests(prQuery);
  } catch (error) {
    console.warn(`Could not search PRs for issue #${issueNumber}: ${error}`);
    notes += `Warning: Could not search PRs for issue #${issueNumber}. `;
  }

  const mergedPrs = prs.filter(pr => pr.mergedAt !== null);

  if (mergedPrs.length > 0) {
    status = 'already_solved';
    evidence.prs = mergedPrs.map(pr => ({
      number: pr.number,
      url: pr.url,
      mergedAt: pr.mergedAt,
      title: pr.title,
    }));
    notes += `Found merged PR(s) referencing issue #${issueNumber}.`;
  }

  // 2. Search commit history for keywords or paths (Placeholder for local git log)
  // The prompt suggests `git log --grep "#<issue_number>"`. This implies local git access.
  // For an API-only approach, searching commit messages directly via API is not straightforward
  // without iterating through commits, which is inefficient.
  // We'll assume this part will be handled by a local `git log` command if needed,
  // or a more sophisticated GitHub search API query if available and efficient.
  // For now, we'll just add a note if no PRs were found.
  if (status === 'not_solved') {
    notes += 'No merged PRs found referencing this issue. Further investigation (e.g., local git log) may be needed.';
  }

  // TODO: Add more sophisticated checks:
  // - Search for tests added corresponding to the issue
  // - Verify by checking the fix is on the default branch (requires more context about default branch)
  // - Verify with tests or a reproduction attempt (when feasible)

  return { status, evidence, notes };
}
