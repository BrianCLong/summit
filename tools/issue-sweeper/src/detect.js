"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectAlreadySolved = detectAlreadySolved;
async function detectAlreadySolved(issue, github) {
    const evidence = {
        prs: [],
        commits: [],
        paths: [],
        tests: [],
    };
    let solved_status = 'not_solved';
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
