import fs from 'fs';
import path from 'path';

// --- CONFIG ---
const ARTIFACTS_ROOT = 'artifacts/stabilization';
const DASHBOARD_OUTPUT = path.join(ARTIFACTS_ROOT, 'dashboard', 'STABILIZATION_DASHBOARD.md');
const LATEST_POINTER_FILE = path.join(ARTIFACTS_ROOT, 'LATEST.json');

// --- HELPER FUNCTIONS ---

function getLatestFile(dir, pattern) {
    if (!fs.existsSync(dir)) return null;
    const files = fs.readdirSync(dir)
        .filter(f => f.match(pattern))
        .sort((a, b) => b.localeCompare(a)); // Sort by name descending (assuming ISO date stamps in filenames)
    return files.length > 0 ? path.join(dir, files[0]) : null;
}

function loadJson(filepath) {
    if (!filepath || !fs.existsSync(filepath)) return null;
    try {
        return JSON.parse(fs.readFileSync(filepath, 'utf8'));
    } catch (e) {
        console.warn(`Failed to parse JSON from ${filepath}: ${e.message}`);
        return null;
    }
}

function loadMarkdown(filepath) {
    if (!filepath || !fs.existsSync(filepath)) return null;
    return fs.readFileSync(filepath, 'utf8');
}

function formatTable(headers, rows) {
    if (!rows || rows.length === 0) return '_No data_';
    const headerLine = `| ${headers.join(' | ')} |`;
    const separatorLine = `| ${headers.map(() => '---').join(' | ')} |`;
    const bodyLines = rows.map(row => `| ${row.join(' | ')} |`);
    return [headerLine, separatorLine, ...bodyLines].join('\n');
}

// --- MAIN ---

async function main() {
    console.log('Generating Stabilization Dashboard...');

    // 1. Resolve Input Paths
    let inputs = {};
    let latestMeta = null;

    if (fs.existsSync(LATEST_POINTER_FILE)) {
        console.log(`Reading LATEST pointer from ${LATEST_POINTER_FILE}`);
        latestMeta = loadJson(LATEST_POINTER_FILE);
    }

    // Heuristic fallback
    inputs.status = getLatestFile(ARTIFACTS_ROOT, /^status\.(json|md)$/);
    inputs.escalation = getLatestFile(ARTIFACTS_ROOT, /^escalation\.json$/);
    inputs.scorecard = getLatestFile(path.join(ARTIFACTS_ROOT, 'scorecard'), /^scorecard_.*\.json$/);
    inputs.diff = getLatestFile(path.join(ARTIFACTS_ROOT, 'snapshots'), /^diff_.*\.json$/);
    inputs.validate = getLatestFile(path.join(ARTIFACTS_ROOT, 'validate'), /^report\.json$/);

    // Override with LATEST if available and specific paths provided
    if (latestMeta && latestMeta.paths) {
        if (latestMeta.paths.status) inputs.status = latestMeta.paths.status;
        if (latestMeta.paths.escalation) inputs.escalation = latestMeta.paths.escalation;
        if (latestMeta.paths.scorecard) inputs.scorecard = latestMeta.paths.scorecard;
        if (latestMeta.paths.diff) inputs.diff = latestMeta.paths.diff;
        if (latestMeta.paths.validate) inputs.validate = latestMeta.paths.validate;
    }

    console.log('Inputs found:', inputs);

    // 2. Load Data
    const statusData = inputs.status?.endsWith('.json') ? loadJson(inputs.status) : { markdown: loadMarkdown(inputs.status) };
    const escalationData = loadJson(inputs.escalation);
    const scorecardData = loadJson(inputs.scorecard);
    const diffData = loadJson(inputs.diff);
    // validate report is optional

    // 3. Generate Sections

    // Header
    const dateStr = new Date().toISOString().split('T')[0];
    const sha = process.env.GITHUB_SHA ? process.env.GITHUB_SHA.substring(0, 7) : 'HEAD';
    let content = `# Stabilization Dashboard\n\n`;
    content += `**Date:** ${dateStr} | **SHA:** ${sha} | **Snapshot:** ${diffData?.current_snapshot_hash || 'UNKNOWN'}\n\n`;

    // Scorecard Highlights
    content += `## Scorecard Highlights\n\n`;
    if (scorecardData) {
        content += `- **Risk Index:** ${scorecardData.risk_index ?? 'UNKNOWN'}\n`;
        content += `- **On-Time Rate:** ${scorecardData.on_time_rate ?? 'UNKNOWN'}%\n`;
        content += `- **Done Items:** ${scorecardData.done_count ?? 'UNKNOWN'}\n\n`;
    } else {
        content += `_Scorecard data unavailable._\n\n`;
    }

    // Overdue & Escalation
    content += `## Overdue & Escalation\n\n`;
    if (escalationData) {
        if (escalationData.overdue_items && escalationData.overdue_items.length > 0) {
             const rows = escalationData.overdue_items.slice(0, 5).map(item => [
                 item.id || '?',
                 item.title || '?',
                 item.days_overdue || '?',
                 item.owner || '?'
             ]);
             content += `**Top Overdue Items:**\n\n`;
             content += formatTable(['ID', 'Title', 'Days Overdue', 'Owner'], rows);
             content += `\n\n_Total Overdue: ${escalationData.total_overdue ?? escalationData.overdue_items.length}_\n\n`;
        } else {
            content += `_No overdue items reported._\n\n`;
        }
    } else {
        content += `_Escalation data unavailable._\n\n`;
    }

    // Issuance & Evidence Compliance
    content += `## Issuance & Evidence Compliance\n\n`;
    if (scorecardData) {
         content += `- **Issuance Completeness:** ${scorecardData.issuance_completeness ?? 'UNKNOWN'}%\n`;
         content += `- **Blocked/Unissued:** ${scorecardData.blocked_unissued_count ?? 'UNKNOWN'}\n`;
         content += `- **Evidence Compliance:** ${scorecardData.evidence_compliance ?? 'UNKNOWN'}%\n\n`;
    } else {
        content += `_Compliance data unavailable._\n\n`;
    }

    // Change Summary
    content += `## What Changed (Since Last Snapshot)\n\n`;
    if (diffData) {
        content += `- **Added:** ${diffData.added?.length ?? 0}\n`;
        content += `- **Removed:** ${diffData.removed?.length ?? 0}\n`;
        content += `- **Modified:** ${diffData.modified?.length ?? 0}\n\n`;
    } else {
        content += `_Diff data unavailable._\n\n`;
    }

    // Artifact Index
    content += `## Artifact Sources\n\n`;
    content += `- **Status:** ${inputs.status || 'MISSING'}\n`;
    content += `- **Escalation:** ${inputs.escalation || 'MISSING'}\n`;
    content += `- **Scorecard:** ${inputs.scorecard || 'MISSING'}\n`;
    content += `- **Diff:** ${inputs.diff || 'MISSING'}\n`;

    // 4. Write Output
    const outDir = path.dirname(DASHBOARD_OUTPUT);
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    fs.writeFileSync(DASHBOARD_OUTPUT, content);
    console.log(`Dashboard generated at ${DASHBOARD_OUTPUT}`);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
