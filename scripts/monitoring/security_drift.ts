import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

async function securityDrift() {
    console.log('Calculating security drift...');

    const security = {
        "lockfile_drift_detected": false,
        "status": "secure",
        "vulnerabilities": 0
    };

    // Check if pnpm-lock.yaml has uncommitted changes using git status
    try {
        const status = execSync('git status --porcelain pnpm-lock.yaml', { encoding: 'utf-8' });
        if (status.trim().length > 0) {
            security.lockfile_drift_detected = true;
            security.status = "drift_detected";
        }

        // Check for pnpm-lock.yaml existence before running pnpm audit
        if (fs.existsSync(path.resolve('pnpm-lock.yaml'))) {
            try {
                const auditOutput = execSync('npx pnpm audit --json', { encoding: 'utf-8', stdio: 'pipe' });
                const auditData = JSON.parse(auditOutput);
                if (auditData.metadata && auditData.metadata.vulnerabilities) {
                    const vulns = auditData.metadata.vulnerabilities;
                    security.vulnerabilities = Object.values(vulns).reduce((a: any, b: any) => a + b, 0) as number;
                    if (security.vulnerabilities > 0) {
                        security.status = "vulnerable";
                    }
                }
            } catch (auditError: any) {
                // pnpm audit returns non-zero if vulnerabilities are found
                if (auditError.stdout) {
                    try {
                        const auditData = JSON.parse(auditError.stdout);
                        if (auditData.metadata && auditData.metadata.vulnerabilities) {
                            const vulns = auditData.metadata.vulnerabilities;
                            security.vulnerabilities = Object.values(vulns).reduce((a: any, b: any) => a + b, 0) as number;
                            if (security.vulnerabilities > 0) {
                                security.status = "vulnerable";
                            }
                        }
                    } catch (e) {
                        console.error("Failed to parse audit output");
                    }
                } else {
                    console.warn("pnpm audit failed to execute", auditError.message);
                }
            }
        }
    } catch (error) {
        console.error("Error during security checks:", error);
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

    fs.writeFileSync(path.join(outDir, 'security-health.json'), stringifyStable(security));
    console.log('Written security-health.json');

    if (security.lockfile_drift_detected || security.vulnerabilities > 0) {
        console.log(`Alert: Security drift detected!`);
        const githubToken = process.env.GITHUB_TOKEN;
        if (githubToken) {
            console.log('Creating issue: Security Drift Alert');
            const repo = process.env.GITHUB_REPOSITORY || "brianclong/summit";
            try {
                const issueRes = await fetch(`https://api.github.com/repos/${repo}/issues`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `token ${githubToken}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'User-Agent': 'security-drift-monitor',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        title: `Security Drift Alert`,
                        body: `Security drift detected.\n\nDetails: \`\`\`json\n${stringifyStable(security)}\n\`\`\``
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
        } else {
            console.log('GITHUB_TOKEN not set, unable to create issue');
        }
    }
}

securityDrift().catch(console.error);
