import * as fs from 'fs';
import * as path from 'path';

async function determinismDrift() {
    console.log('Calculating determinism drift...');

    const drift = {
        "checked_fields": ["id", "timestamp", "signature"],
        "drift_detected": false,
        "failed_fields": [] as string[],
        "status": "clean"
    };

    // Compare current vs baseline artifacts if they exist
    const evalsDir = path.resolve('artifacts/ai-evals');
    const baselinePath = path.join(evalsDir, 'baseline.json');
    const currentPath = path.join(evalsDir, 'current.json');

    if (fs.existsSync(baselinePath) && fs.existsSync(currentPath)) {
        try {
            const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
            const current = JSON.parse(fs.readFileSync(currentPath, 'utf8'));

            // Basic recursive comparison function to detect non-deterministic fields
            // that are not supposed to be in the payload
            function compareAndFindDrift(base: any, curr: any, currentPath: string = '') {
                if (typeof base !== typeof curr) {
                    drift.failed_fields.push(`${currentPath} (type mismatch)`);
                    return;
                }

                if (Array.isArray(base)) {
                    if (base.length !== curr.length) {
                        drift.failed_fields.push(`${currentPath} (array length mismatch)`);
                        return;
                    }
                    for (let i = 0; i < base.length; i++) {
                        compareAndFindDrift(base[i], curr[i], `${currentPath}[${i}]`);
                    }
                } else if (typeof base === 'object' && base !== null) {
                    const baseKeys = Object.keys(base);
                    const currKeys = Object.keys(curr);

                    for (const key of baseKeys) {
                        // Ignore known non-deterministic fields if they are at the root or specific envelopes
                        // But if they are nested where they shouldn't be, flag them.
                        const newPath = currentPath ? `${currentPath}.${key}` : key;

                        if (!currKeys.includes(key)) {
                            drift.failed_fields.push(`${newPath} (missing in current)`);
                        } else {
                            // If it's a timestamp or id that we expect to be deterministic but it's not
                            if ((key === 'timestamp' || key === 'id' || key.endsWith('_id') || key.endsWith('At')) &&
                                base[key] !== curr[key]) {
                                // For this exercise, we flag any changing ids/timestamps as drift
                                // unless they are in a specific allowed envelope like "stamp.json"
                                drift.failed_fields.push(newPath);
                            } else {
                                compareAndFindDrift(base[key], curr[key], newPath);
                            }
                        }
                    }
                } else {
                    if (base !== curr) {
                        // Value changed
                        drift.failed_fields.push(`${currentPath} (value changed)`);
                    }
                }
            }

            compareAndFindDrift(baseline, current);

            if (drift.failed_fields.length > 0) {
                drift.drift_detected = true;
                drift.status = "drift_detected";
            }

        } catch (e) {
            console.error("Error comparing baseline and current:", e);
            drift.status = "error";
        }
    } else {
        console.log("Baseline or current evaluation artifacts not found. Skipping detailed comparison.");
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

    fs.writeFileSync(path.join(outDir, 'determinism-drift.json'), stringifyStable(drift));
    console.log('Written determinism-drift.json');

    if (drift.drift_detected) {
        console.log(`Alert: Determinism drift detected in fields: ${drift.failed_fields.join(', ')}`);

        const githubToken = process.env.GITHUB_TOKEN;
        if (githubToken) {
            console.log('Creating issue: Determinism Drift Detected');
            const repo = process.env.GITHUB_REPOSITORY || "brianclong/summit";
            try {
                const issueRes = await fetch(`https://api.github.com/repos/${repo}/issues`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `token ${githubToken}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'User-Agent': 'determinism-drift-monitor',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        title: `Determinism Drift Alert`,
                        body: `Determinism drift detected.\n\nDetails: \`\`\`json\n${stringifyStable(drift)}\n\`\`\``
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

determinismDrift().catch(console.error);
