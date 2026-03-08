"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const path_1 = require("path");
const metrics_shim_1 = require("./metrics-shim");
// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    underscore: '\x1b[4m',
    blink: '\x1b[5m',
    reverse: '\x1b[7m',
    hidden: '\x1b[8m',
    fg: {
        black: '\x1b[30m',
        red: '\x1b[31m',
        green: '\x1b[32m',
        yellow: '\x1b[33m',
        blue: '\x1b[34m',
        magenta: '\x1b[35m',
        cyan: '\x1b[36m',
        white: '\x1b[37m',
    },
    bg: {
        black: '\x1b[40m',
        red: '\x1b[41m',
        green: '\x1b[42m',
        yellow: '\x1b[43m',
        blue: '\x1b[44m',
        magenta: '\x1b[45m',
        cyan: '\x1b[46m',
        white: '\x1b[47m',
    },
};
const log = (step, message, color = colors.fg.white) => {
    console.log(`${colors.bright}${colors.fg.cyan}[${step}]${colors.reset} ${color}${message}${colors.reset}`);
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function runDemo() {
    console.log(`${colors.bright}${colors.fg.magenta}=== Org Mesh Twin: GA Buyer Demo ===${colors.reset}\n`);
    // 1. Load Mock Data
    log('SETUP', 'Loading mock organization data...', colors.fg.yellow);
    const mockDataPath = (0, path_1.join)(process.cwd(), 'mock-org-data.json');
    const mockData = JSON.parse((0, fs_1.readFileSync)(mockDataPath, 'utf-8'));
    await sleep(800);
    log('SETUP', `Loaded ${mockData.users.length} users and ${mockData.repos.length} repositories.`, colors.fg.green);
    // 2. Ingest
    log('INGEST', 'Ingesting SCIM identity data...', colors.fg.blue);
    await metrics_shim_1.metrics.traceOperation('ingest_scim', async () => {
        await sleep(1200);
        metrics_shim_1.metrics.ingestDuration.observe({ source: 'scim', status: 'success' }, 1.2);
        metrics_shim_1.metrics.graphNodesCount.set({ type: 'Identity' }, mockData.users.length);
    });
    log('INGEST', 'Ingesting GitHub repository metadata...', colors.fg.blue);
    await metrics_shim_1.metrics.traceOperation('ingest_github', async () => {
        await sleep(1500);
        metrics_shim_1.metrics.ingestDuration.observe({ source: 'github', status: 'success' }, 1.5);
        metrics_shim_1.metrics.graphNodesCount.set({ type: 'Repository' }, mockData.repos.length);
    });
    log('INGEST', 'Data ingestion complete. Graph updated.', colors.fg.green);
    // 3. Drift Detection
    log('DETECT', 'Running Drift Detection analysis...', colors.fg.yellow);
    await metrics_shim_1.metrics.traceOperation('drift_detection', async () => {
        await sleep(2000);
        const driftRepos = mockData.repos.filter((r) => !r.branchProtection);
        metrics_shim_1.metrics.driftDetectionCount.inc({ severity: 'high', type: 'branch_protection_disabled' }, driftRepos.length);
        log('DETECT', `Found ${driftRepos.length} repositories with disabled branch protection!`, colors.fg.red);
        driftRepos.forEach((r) => {
            console.log(`  ${colors.fg.red}⚠${colors.reset} ${r.name} (Owner: ${r.owner || 'unknown'})`);
        });
    });
    // 4. Narrative Detection
    log('NARRATIVE', 'Analyzing communication patterns for narrative signals...', colors.fg.magenta);
    await metrics_shim_1.metrics.traceOperation('narrative_detection', async () => {
        await sleep(2500);
        const signals = mockData.narrativeSignals;
        metrics_shim_1.metrics.narrativeSignalsCount.inc({ campaign_type: 'security_bypass' }, signals.length);
        log('NARRATIVE', `Detected ${signals.length} suspicious narrative signals.`, colors.fg.red);
        signals.forEach((s) => {
            console.log(`  ${colors.fg.magenta}👁${colors.reset} [${s.type}] User ${s.userId}: "${s.content}" (Risk: ${s.riskScore})`);
        });
    });
    // 5. Orchestration (Agent Proposal)
    log('ORCHESTRATE', 'Agent proposing remediation plan...', colors.fg.cyan);
    await metrics_shim_1.metrics.traceOperation('agent_proposal', async () => {
        await sleep(1800);
        log('ORCHESTRATE', 'Proposal generated: "Enforce Branch Protection on affected repos"', colors.fg.green);
        console.log(`  ${colors.fg.cyan}➜${colors.reset} Action: Create PR to add branch protection rule`);
        console.log(`  ${colors.fg.cyan}➜${colors.reset} Action: Notify security team of narrative signals`);
        metrics_shim_1.metrics.agentActionSuccessRate.set({ agent_id: 'security_fixer' }, 0.95);
    });
    // 6. Notification
    log('NOTIFY', 'Sending alerts to Switchboard...', colors.fg.blue);
    await metrics_shim_1.metrics.traceOperation('notify_switchboard', async () => {
        await sleep(500);
        log('NOTIFY', 'Alerts sent via Slack and Email.', colors.fg.green);
    });
    console.log(`\n${colors.bright}${colors.fg.green}=== Demo Complete: Org Mesh Twin is Buyer Ready ===${colors.reset}`);
    // Dump metrics to console for verification
    console.log('\n--- Metrics Output (Simulated) ---');
    console.log(await metrics_shim_1.register.metrics());
}
runDemo().catch(console.error);
