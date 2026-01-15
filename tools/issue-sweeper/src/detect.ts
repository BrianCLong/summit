import { GitHubClient } from './github.js';

export interface Evidence {
    prs: { number: number; url: string; mergedAt: string | null; title: string }[];
    commits: { sha: string; url: string; message: string }[];
    paths: { path: string; reason: string }[];
    tests: { name: string; command: string }[];
}

export type SolvedStatus = 'already_solved' | 'not_solved' | 'blocked' | 'duplicate' | 'invalid' | 'solved_in_this_run';

export interface DetectionResult {
    solved_status: SolvedStatus;
    evidence: Evidence;
}

export async function detectAlreadySolved(issue: any, github: GitHubClient): Promise<DetectionResult> {
    const evidence: Evidence = {
        prs: [],
        commits: [],
        paths: [],
        tests: [],
    };
    let solved_status: SolvedStatus = 'not_solved';

    // Search for PRs referencing the issue
    const searchResults = await github.searchPRs(issue.number);
    if (searchResults.items && searchResults.items.length > 0) {
        for (const pr of searchResults.items) {
            evidence.prs.push({
                number: pr.number,
                url: pr.html_url,
                mergedAt: pr.pull_request?.merged_at || null,
                title: pr.title,
            });

            if (pr.pull_request?.merged_at) {
                solved_status = 'already_solved';
            }
        }
    }

    // A more robust check could involve checking for closing keywords in PRs/commits
    // e.g. "Closes #123", "Fixes #123"
    // This would require more detailed parsing of PR/commit bodies.

    // For now, a merged PR referencing the issue is our primary signal.

    return {
        solved_status,
        evidence,
    };
}