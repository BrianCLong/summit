import * as fs from 'fs';
import * as path from 'path';

async function ciHealth() {
    console.log('Calculating CI health...');

    // Default mock data in case API call isn't possible
    const health = {
        "failure_rate": 0.05,
        "total_runs": 100,
        "workflows": [
            { "name": "ci-core", "failure_rate": 0.02 },
            { "name": "e2e-tests", "failure_rate": 0.10 }
        ]
    };

    const githubToken = process.env.GITHUB_TOKEN;
    if (githubToken) {
        console.log("Fetching actual CI runs from GitHub API...");
        try {
            const repo = process.env.GITHUB_REPOSITORY || "brianclong/summit";
            const response = await fetch(`https://api.github.com/repos/${repo}/actions/runs?per_page=100`, {
                headers: {
                    'Authorization': `token ${githubToken}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'ci-health-monitor'
                }
            });

            if (response.ok) {
                const data: any = await response.json();
                const total = data.workflow_runs.length;
                if (total > 0) {
                    const failed = data.workflow_runs.filter((r: any) => r.conclusion === 'failure' || r.conclusion === 'timed_out').length;
                    health.total_runs = total;
                    health.failure_rate = failed / total;

                    // Group by workflow id/name
                    const workflowsMap = new Map();
                    for (const run of data.workflow_runs) {
                        const name = run.name;
                        if (!workflowsMap.has(name)) {
                            workflowsMap.set(name, { total: 0, failed: 0 });
                        }
                        const stats = workflowsMap.get(name);
                        stats.total++;
                        if (run.conclusion === 'failure' || run.conclusion === 'timed_out') {
                            stats.failed++;
                        }
                    }

                    health.workflows = Array.from(workflowsMap.entries()).map(([name, stats]) => ({
                        name: String(name),
                        failure_rate: stats.failed / stats.total
                    })).sort((a, b) => a.name.localeCompare(b.name));
                }
            } else {
                console.warn(`GitHub API error: ${response.status} ${response.statusText}`);
            }
        } catch (error) {
            console.error("Failed to fetch CI runs:", error);
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

    fs.writeFileSync(path.join(outDir, 'ci-health.json'), stringifyStable(health));
    console.log('Written ci-health.json');

    // Threshold check
    const FAILURE_THRESHOLD = parseFloat(process.env.FAILURE_THRESHOLD || "0.15");
    if (health.failure_rate > FAILURE_THRESHOLD) {
        console.log(`Alert: Overall CI failure rate (${health.failure_rate}) exceeds threshold (${FAILURE_THRESHOLD})`);

        if (githubToken) {
            console.log('Creating an issue on GitHub for CI Health breach.');
            const repo = process.env.GITHUB_REPOSITORY || "brianclong/summit";
            try {
                const issueRes = await fetch(`https://api.github.com/repos/${repo}/issues`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `token ${githubToken}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'User-Agent': 'ci-health-monitor',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        title: `CI Health Alert: Failure rate ${health.failure_rate.toFixed(2)}`,
                        body: `The overall CI failure rate has exceeded the threshold of ${FAILURE_THRESHOLD}.\n\nDetails: \`\`\`json\n${stringifyStable(health)}\n\`\`\``
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

ciHealth().catch(console.error);
