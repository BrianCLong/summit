/**
 * CI Failure Capture Script
 * Analyzes CI logs and generates triage artifacts using the taxonomy classifier.
 */

import fs from 'fs';
import path from 'path';
import { classifyFailure } from './classify_failure.mjs';

const TRIAGE_OUTPUT_DIR = process.env.TRIAGE_OUTPUT_DIR || 'triage-artifacts';
const LOG_FILE = process.argv[2];

function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

async function captureFailures() {
    console.log('Starting CI Failure Capture...');

    if (!LOG_FILE) {
        console.error('Usage: node scripts/ci/capture_failures.mjs <logfile>');
        process.exit(1);
    }

    if (!fs.existsSync(LOG_FILE)) {
        console.error(`Log file not found: ${LOG_FILE}`);
        // We exit gracefully to not break the pipeline if log is missing
        process.exit(0);
    }

    const logContent = fs.readFileSync(LOG_FILE, 'utf8');
    const classification = classifyFailure(logContent);

    ensureDir(TRIAGE_OUTPUT_DIR);

    // 1. Generate JSON artifact
    const triageJsonPath = path.join(TRIAGE_OUTPUT_DIR, 'triage.json');
    const triageData = {
        timestamp: new Date().toISOString(),
        log_file: LOG_FILE,
        failure_code: classification.code,
        failure_category: classification.category,
        matched_signature: classification.matched_signature,
        recommended_next_steps: classification.next_steps,
        title: classification.title,
        diagnosis: classification.diagnosis,
        severity: classification.severity
    };

    fs.writeFileSync(triageJsonPath, JSON.stringify(triageData, null, 2));
    console.log(`Generated triage JSON: ${triageJsonPath}`);

    // 2. Generate Markdown artifact (triage.md)
    const triageMdPath = path.join(TRIAGE_OUTPUT_DIR, 'triage.md');
    const mdContent = `
# CI Failure Report

**Code:** \`${classification.code}\`
**Category:** ${classification.category}
**Title:** ${classification.title}
**Severity:** ${classification.severity}

## Diagnosis
${classification.diagnosis}

## Matched Signature
\`\`\`
${classification.matched_signature}
\`\`\`

## Recommended Next Steps
${classification.next_steps.map(step => `- ${step}`).join('\n')}

[View Full Log](${path.basename(LOG_FILE)})
`;
    fs.writeFileSync(triageMdPath, mdContent);
    console.log(`Generated triage Markdown: ${triageMdPath}`);

    // 3. Update Job Summary (if GITHUB_STEP_SUMMARY is set)
    if (process.env.GITHUB_STEP_SUMMARY) {
        try {
            const summaryContent = `
### ❌ CI Failure Detected: ${classification.code}

> **${classification.title}**
> ${classification.diagnosis}

**Next Steps:**
${classification.next_steps.slice(0, 2).map(step => `- ${step}`).join('\n')}

[See Triage Artifacts](${triageMdPath})
`;
            fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summaryContent);
            console.log('Updated GitHub Step Summary');
        } catch (e) {
            console.error('Failed to update GitHub Step Summary:', e);
        }
    }

    // 4. Update rerun_hints.md (optional, if file exists or we create it)
    const rerunHintsPath = path.join(TRIAGE_OUTPUT_DIR, 'rerun_hints.md');
    const hintsContent = `Failure Code: ${classification.code}\nRetry Strategy: Check ${classification.category} issues.\n`;
    fs.writeFileSync(rerunHintsPath, hintsContent);
    console.log(`Generated rerun hints: ${rerunHintsPath}`);
}

captureFailures().catch(err => {
    console.error('Unhandled error in capture_failures.mjs:', err);
    process.exit(1);
});
