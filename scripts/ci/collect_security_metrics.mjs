import { execSync } from 'child_process';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';

// Configuration
const ARTIFACT_PATH = process.env.ARTIFACT_PATH || 'artifacts/security-metrics.json';
const PREVIOUS_ARTIFACT_PATH = process.env.PREVIOUS_ARTIFACT_PATH || 'previous-metrics/security-metrics.json';
const SUMMARY_PATH = process.env.GITHUB_STEP_SUMMARY;
const ALERT_THRESHOLD_CRITICAL = parseInt(process.env.ALERT_THRESHOLD_CRITICAL || '0', 10);
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY;

if (!GITHUB_REPOSITORY) {
    console.error("GITHUB_REPOSITORY env var not set.");
    process.exit(1);
}

// Ensure artifacts dir exists
const artifactDir = path.dirname(ARTIFACT_PATH);
if (!existsSync(artifactDir)) {
    mkdirSync(artifactDir, { recursive: true });
}

function runCommand(cmd) {
    try {
        // Increase maxBuffer for large JSON payloads
        return execSync(cmd, { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (e) {
        const stderr = e.stderr ? e.stderr.toString() : '';
        // Check for specific error conditions we can ignore
        if (stderr.includes('disabled') || stderr.includes('404 Not Found') || stderr.includes('no analysis found')) {
            console.warn(`Command failed with likely benign error (feature disabled?): ${cmd}\n${stderr}`);
            return '[]';
        }
        console.error(`Command failed: ${cmd}`);
        console.error(stderr);
        throw e;
    }
}

function fetchCodeScanningAlerts() {
    console.log("Fetching Code Scanning alerts...");
    // We only care about open alerts
    const output = runCommand(`gh api "repos/${GITHUB_REPOSITORY}/code-scanning/alerts?state=open" --paginate`);
    try {
        return JSON.parse(output);
    } catch (e) {
        // Sometimes gh api paginate output might be tricky if empty
        if (!output.trim()) return [];
        // Attempt to fix concatenated JSON arrays if that happens (though gh api usually handles it)
        try {
            // Handle concatenation with potential whitespace/newlines
            return JSON.parse(`[${output.replace(/\]\s*\[/g, '],[')}]`).flat();
        } catch (e2) {
             throw new Error(`Failed to parse Code Scanning output: ${e.message}`);
        }
    }
}

function fetchDependabotAlerts() {
    console.log("Fetching Dependabot alerts...");
    const output = runCommand(`gh api "repos/${GITHUB_REPOSITORY}/dependabot/alerts?state=open" --paginate`);
    try {
        return JSON.parse(output);
    } catch (e) {
        if (!output.trim()) return [];
        try {
            return JSON.parse(`[${output.replace(/\]\s*\[/g, '],[')}]`).flat();
        } catch (e2) {
             throw new Error(`Failed to parse Dependabot output: ${e.message}`);
        }
    }
}

function countSeverities(alerts, type) {
    const counts = { critical: 0, high: 0, medium: 0, low: 0, total: 0 };

    for (const alert of alerts) {
        let severity = 'unknown';
        if (type === 'code-scanning') {
            // Prefer security_severity_level, fall back to severity
            severity = alert.rule?.security_severity_level || alert.rule?.severity;
        } else if (type === 'dependabot') {
            severity = alert.security_advisory?.severity;
        }

        if (severity) {
            severity = severity.toLowerCase();
            if (counts[severity] !== undefined) {
                counts[severity]++;
            }
        }
        counts.total++;
    }
    return counts;
}

function generateMarkdown(current, previous) {
    let md = `## 🛡️ Security Observability Report\n\n`;
    md += `**Timestamp:** ${current.timestamp}\n\n`;

    const getTrend = (curr, prev) => {
        if (prev === undefined) return '';
        if (curr > prev) return `(🔺 +${curr - prev})`;
        if (curr < prev) return `(🔻 -${prev - curr})`;
        return '(➖)';
    };

    md += `### Summary\n\n`;
    md += `| Category | Critical | High | Medium | Low | Total |\n`;
    md += `| :--- | :---: | :---: | :---: | :---: | :---: |\n`;

    // Code Scanning
    const cs = current.codeScanning;
    const csPrev = previous?.codeScanning || {};
    md += `| **Code Scanning** | ${cs.critical} ${getTrend(cs.critical, csPrev.critical)} | ${cs.high} ${getTrend(cs.high, csPrev.high)} | ${cs.medium} | ${cs.low} | ${cs.total} |\n`;

    // Dependabot
    const db = current.dependabot;
    const dbPrev = previous?.dependabot || {};
    md += `| **Dependabot** | ${db.critical} ${getTrend(db.critical, dbPrev.critical)} | ${db.high} ${getTrend(db.high, dbPrev.high)} | ${db.medium} | ${db.low} | ${db.total} |\n`;

    // Totals
    const totalCrit = cs.critical + db.critical;
    const totalHigh = cs.high + db.high;
    const prevCrit = (csPrev.critical || 0) + (dbPrev.critical || 0);
    const prevHigh = (csPrev.high || 0) + (dbPrev.high || 0);

    md += `| **Total** | **${totalCrit}** ${getTrend(totalCrit, prevCrit)} | **${totalHigh}** ${getTrend(totalHigh, prevHigh)} | - | - | - |\n`;

    return md;
}

function main() {
    console.log(`Starting security metrics collection for ${GITHUB_REPOSITORY}...`);

    let codeScanningAlerts = [];
    try {
        codeScanningAlerts = fetchCodeScanningAlerts();
    } catch (e) {
        console.error("Failed to fetch Code Scanning alerts, continuing with empty list.");
    }

    let dependabotAlerts = [];
    try {
        dependabotAlerts = fetchDependabotAlerts();
    } catch (e) {
        console.error("Failed to fetch Dependabot alerts, continuing with empty list.");
    }

    const currentMetrics = {
        timestamp: new Date().toISOString(),
        repo: GITHUB_REPOSITORY,
        codeScanning: countSeverities(codeScanningAlerts, 'code-scanning'),
        dependabot: countSeverities(dependabotAlerts, 'dependabot')
    };

    console.log("Current Metrics:", JSON.stringify(currentMetrics, null, 2));

    // Load previous metrics
    let previousMetrics = null;
    if (existsSync(PREVIOUS_ARTIFACT_PATH)) {
        try {
            previousMetrics = JSON.parse(readFileSync(PREVIOUS_ARTIFACT_PATH, 'utf8'));
            console.log("Loaded previous metrics.");
        } catch (e) {
            console.warn("Failed to parse previous metrics file.");
        }
    } else {
        console.log("No previous metrics found.");
    }

    // Write artifacts
    writeFileSync(ARTIFACT_PATH, JSON.stringify(currentMetrics, null, 2));
    console.log(`Metrics written to ${ARTIFACT_PATH}`);

    // Generate Summary
    const summaryMarkdown = generateMarkdown(currentMetrics, previousMetrics);

    if (SUMMARY_PATH) {
        try {
            writeFileSync(SUMMARY_PATH, summaryMarkdown, { flag: 'a' });
        } catch (e) {
            console.error("Failed to write to GITHUB_STEP_SUMMARY", e);
        }
    } else {
        console.log(summaryMarkdown);
    }

    // Alerting Logic
    const totalCritical = currentMetrics.codeScanning.critical + currentMetrics.dependabot.critical;
    const prevCritical = previousMetrics ? (previousMetrics.codeScanning.critical + previousMetrics.dependabot.critical) : 0;

    const issues = [];
    if (totalCritical > ALERT_THRESHOLD_CRITICAL) {
        issues.push(`Critical alert count (${totalCritical}) exceeds threshold (${ALERT_THRESHOLD_CRITICAL}).`);
    }

    // Week-over-week increase check (simplified to "since last run" here, assuming weekly schedule)
    if (previousMetrics && totalCritical > prevCritical) {
        issues.push(`Critical alerts increased from ${prevCritical} to ${totalCritical}.`);
    }

    if (issues.length > 0) {
        console.error("\n🚨 SECURITY ALERT TRIGGERED 🚨");
        issues.forEach(i => console.error(`- ${i}`));

        // Add alerts to summary
        if (SUMMARY_PATH) {
             writeFileSync(SUMMARY_PATH, `\n\n### 🚨 Alerts Triggered\n${issues.map(i => `- ${i}`).join('\n')}\n`, { flag: 'a' });
        }

        // Fail the job if we want strict alerting
        process.exit(1);
    } else {
        console.log("\n✅ Security posture within limits.");
    }
}

main();
