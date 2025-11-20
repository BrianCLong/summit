/**
 * GitHub API integration for fetching issues and PRs
 */
export async function fetchGitHubIssues(options) {
    const { owner, repo, token, includeIssues = true, includePRs = false, state = 'open', labels = [], maxResults = 1000, } = options;
    const items = [];
    let page = 1;
    const perPage = 100;
    const headers = {
        Accept: 'application/vnd.github.v3+json',
    };
    if (token) {
        headers.Authorization = `token ${token}`;
    }
    while (items.length < maxResults) {
        const params = new URLSearchParams({
            state,
            per_page: perPage.toString(),
            page: page.toString(),
            sort: 'created',
            direction: 'desc',
        });
        if (labels.length > 0) {
            params.append('labels', labels.join(','));
        }
        const url = `https://api.github.com/repos/${owner}/${repo}/issues?${params}`;
        try {
            const response = await fetch(url, { headers });
            if (!response.ok) {
                const error = await response.text();
                throw new Error(`GitHub API error: ${response.status} ${error}`);
            }
            const issues = (await response.json());
            if (issues.length === 0)
                break;
            for (const issue of issues) {
                // Filter based on includeIssues/includePRs
                const isPR = !!issue.pull_request;
                if (isPR && !includePRs)
                    continue;
                if (!isPR && !includeIssues)
                    continue;
                const item = {
                    id: `github-${issue.number}`,
                    title: issue.title,
                    description: issue.body || '',
                    source: 'github',
                    sourceId: issue.number.toString(),
                    area: extractAreasFromLabels(issue.labels),
                    impact: extractImpactFromLabels(issue.labels),
                    type: extractTypeFromLabels(issue.labels, isPR),
                    owner: issue.assignee?.login,
                    status: issue.state,
                    impactScore: 0,
                    complexityScore: estimateGitHubIssueComplexity(issue),
                    isGoodFirstIssue: issue.labels.some((l) => ['good first issue', 'good-first-issue', 'beginner'].includes(l.name.toLowerCase())),
                    raw: issue,
                };
                items.push(item);
                if (items.length >= maxResults)
                    break;
            }
            page++;
        }
        catch (error) {
            console.error(`Error fetching GitHub issues: ${error}`);
            break;
        }
    }
    return items;
}
function extractAreasFromLabels(labels) {
    const areaLabels = labels
        .map((l) => l.name)
        .filter((name) => name.startsWith('area:'))
        .map((name) => name.replace('area:', ''));
    return areaLabels.length > 0 ? areaLabels : [];
}
function extractImpactFromLabels(labels) {
    const labelNames = labels.map((l) => l.name.toLowerCase());
    if (labelNames.some((n) => n.includes('blocker') || n.includes('critical') || n.includes('p0'))) {
        return 'blocker';
    }
    if (labelNames.some((n) => n.includes('high') || n.includes('p1'))) {
        return 'high';
    }
    if (labelNames.some((n) => n.includes('medium') || n.includes('p2'))) {
        return 'medium';
    }
    return 'low';
}
function extractTypeFromLabels(labels, isPR) {
    const labelNames = labels.map((l) => l.name.toLowerCase());
    if (labelNames.some((n) => n.includes('bug') || n.includes('error'))) {
        return 'bug';
    }
    if (labelNames.some((n) => n.includes('tech') && n.includes('debt'))) {
        return 'tech-debt';
    }
    if (labelNames.some((n) => n.includes('feature'))) {
        return 'feature';
    }
    if (labelNames.some((n) => n.includes('enhancement') || n.includes('improvement')) ||
        isPR) {
        return 'enhancement';
    }
    return 'feature';
}
function estimateGitHubIssueComplexity(issue) {
    let score = 25; // Base score
    // Body length complexity
    const bodyLength = issue.body?.length || 0;
    if (bodyLength > 1000)
        score += 20;
    else if (bodyLength > 500)
        score += 10;
    // Label-based complexity
    const labelNames = issue.labels.map((l) => l.name.toLowerCase());
    if (labelNames.some((n) => n.includes('complex') || n.includes('hard'))) {
        score += 30;
    }
    // Has assignee = may be more complex or already in progress
    if (issue.assignee) {
        score += 10;
    }
    return score;
}
/**
 * CLI-friendly wrapper that uses environment variables
 */
export async function fetchGitHubIssuesFromEnv() {
    const owner = process.env.GITHUB_OWNER || 'BrianCLong';
    const repo = process.env.GITHUB_REPO || 'summit';
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
        console.warn('GITHUB_TOKEN not set. GitHub API rate limits will be restrictive. Set GITHUB_TOKEN for higher limits.');
    }
    return fetchGitHubIssues({
        owner,
        repo,
        token,
        includeIssues: true,
        includePRs: false,
        state: 'open',
        maxResults: 500,
    });
}
//# sourceMappingURL=github-fetcher.js.map