import * as fs from 'fs';
import * as path from 'path';

async function repoEntropy() {
    console.log('Calculating repo entropy...');

    const entropy = {
        "avg_ci_runtime_minutes": 15.5,
        "open_issue_count": 150,
        "open_pr_count": 42
    };

    const githubToken = process.env.GITHUB_TOKEN;
    if (githubToken) {
        console.log("Fetching repo data from GitHub API...");
        try {
            const repo = process.env.GITHUB_REPOSITORY || "brianclong/summit";

            // Get open PRs count
            const prsRes = await fetch(`https://api.github.com/search/issues?q=repo:${repo}+is:pr+is:open`, {
                headers: {
                    'Authorization': `token ${githubToken}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'repo-entropy-monitor'
                }
            });

            // Get open issues count
            const issuesRes = await fetch(`https://api.github.com/search/issues?q=repo:${repo}+is:issue+is:open`, {
                headers: {
                    'Authorization': `token ${githubToken}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'repo-entropy-monitor'
                }
            });

            // Calculate avg CI runtime from recent runs
            const runsRes = await fetch(`https://api.github.com/repos/${repo}/actions/runs?per_page=30&status=completed`, {
                headers: {
                    'Authorization': `token ${githubToken}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'repo-entropy-monitor'
                }
            });

            if (prsRes.ok) {
                const prsData: any = await prsRes.json();
                entropy.open_pr_count = prsData.total_count;
            } else {
                console.warn(`PR API error: ${prsRes.statusText}`);
            }

            if (issuesRes.ok) {
                const issuesData: any = await issuesRes.json();
                entropy.open_issue_count = issuesData.total_count;
            } else {
                console.warn(`Issue API error: ${issuesRes.statusText}`);
            }

            if (runsRes.ok) {
                const runsData: any = await runsRes.json();
                let totalTime = 0;
                let validRuns = 0;

                for (const run of runsData.workflow_runs) {
                    if (run.created_at && run.updated_at) {
                        const created = new Date(run.created_at).getTime();
                        const updated = new Date(run.updated_at).getTime();
                        const durationMs = updated - created;
                        if (durationMs > 0) {
                            totalTime += durationMs;
                            validRuns++;
                        }
                    }
                }

                if (validRuns > 0) {
                    entropy.avg_ci_runtime_minutes = parseFloat((totalTime / validRuns / 60000).toFixed(2));
                } else {
                    entropy.avg_ci_runtime_minutes = 0;
                }
            } else {
                console.warn(`Runs API error: ${runsRes.statusText}`);
            }

        } catch (error) {
            console.error("Failed to fetch repo data:", error);
        }
    } else {
        console.warn("GITHUB_TOKEN not found. Using simulated data.");
    }

    const outDir = path.resolve('artifacts/monitoring');
    fs.mkdirSync(outDir, { recursive: true });

    // Custom stable stringify
    function stringifyStable(obj: any): string {
        if (Array.isArray(obj)) {
            return JSON.stringify(obj.map(item =>
                typeof item === 'object' && item !== null ? JSON.parse(stringifyStable(item)) : item
            ), null, 2);
        } else if (typeof obj === 'object' && obj !== null) {
            const sortedObj: any = {};
            Object.keys(obj).sort().forEach(key => {
                sortedObj[key] = typeof obj[key] === 'object' && obj[key] !== null
                    ? JSON.parse(stringifyStable(obj[key]))
                    : obj[key];
            });
            return JSON.stringify(sortedObj, null, 2);
        }
        return JSON.stringify(obj, null, 2);
    }

    fs.writeFileSync(path.join(outDir, 'repo-health.json'), stringifyStable(entropy));
    console.log('Written repo-health.json');

    const PR_THRESHOLD = parseInt(process.env.PR_THRESHOLD || "50", 10);
    const ISSUE_THRESHOLD = parseInt(process.env.ISSUE_THRESHOLD || "200", 10);

    if (entropy.open_pr_count > PR_THRESHOLD || entropy.open_issue_count > ISSUE_THRESHOLD) {
        console.log(`Alert: Repo entropy exceeds thresholds (PRs: ${entropy.open_pr_count}/${PR_THRESHOLD}, Issues: ${entropy.open_issue_count}/${ISSUE_THRESHOLD})`);

        if (githubToken) {
            console.log('Creating issue: High Repository Entropy Alert');
            const repo = process.env.GITHUB_REPOSITORY || "brianclong/summit";
            try {
                const issueRes = await fetch(`https://api.github.com/repos/${repo}/issues`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `token ${githubToken}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'User-Agent': 'repo-entropy-monitor',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        title: `Repository Entropy Alert`,
                        body: `Repository entropy thresholds breached.\n\nDetails: \`\`\`json\n${stringifyStable(entropy)}\n\`\`\``
                    })
                });
                if (!issueRes.ok) {
                    console.error(`Failed to create issue: ${issueRes.status} ${issueRes.statusText}`);
                } else {
                    console.log('Issue created successfully.');
                }
            } catch (error) {
                console.error("Failed to create issue:", error);
            }
        }
    }
}

repoEntropy().catch(console.error);
