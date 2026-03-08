#!/usr/bin/env -S npx tsx
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// Configuration
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY || 'IntelGraph/intelgraph-platform'; // Default or from env
const [OWNER, REPO] = GITHUB_REPOSITORY.split('/');
const OUTPUT_DIR = process.argv.includes('--out')
    ? process.argv[process.argv.indexOf('--out') + 1]
    : 'docs/ops/pr-triage';
const CRITICAL_PATHS = [
    '.github/workflows',
    'policy/',
    'scripts/',
    'package.json',
    'pnpm-lock.yaml',
    'server/src/config'
];
// Helper for GitHub API using native fetch
async function githubFetch(endpoint, options = {}) {
    const url = `https://api.github.com${endpoint}`;
    const headers = {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
        ...options.headers
    };
    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
        throw new Error(`GitHub API Error: ${response.status} ${response.statusText}`);
    }
    return response.json();
}
async function fetchOpenPRs() {
    if (!GITHUB_TOKEN) {
        console.warn('⚠️ GITHUB_TOKEN not set. Running in MOCK mode.');
        return getMockPRs();
    }
    try {
        const params = new URLSearchParams({ state: 'open', per_page: '100', sort: 'created', direction: 'asc' });
        return await githubFetch(`/repos/${OWNER}/${REPO}/pulls?${params}`);
    }
    catch (error) {
        console.error('Failed to fetch PRs:', error.message);
        process.exit(1);
    }
}
async function fetchPRFiles(prNumber) {
    if (!GITHUB_TOKEN)
        return [];
    try {
        const data = await githubFetch(`/repos/${OWNER}/${REPO}/pulls/${prNumber}/files?per_page=100`);
        return data.map((f) => f.filename);
    }
    catch (error) {
        console.error(`Failed to fetch files for PR #${prNumber}`);
        return [];
    }
}
async function fetchPRChecks(ref) {
    if (!GITHUB_TOKEN)
        return { status: 'MISSING', failing: [] };
    try {
        // Get combined status (commit status API)
        const statusRes = await githubFetch(`/repos/${OWNER}/${REPO}/commits/${ref}/status`);
        // Get check runs (Check Runs API)
        const checksRes = await githubFetch(`/repos/${OWNER}/${REPO}/commits/${ref}/check-runs`);
        const failures = [];
        let status = 'SUCCESS';
        // Process Statuses
        if (statusRes.state === 'failure' || statusRes.state === 'error') {
            status = 'FAILURE';
            failures.push('Commit Status Failure');
        }
        else if (statusRes.state === 'pending') {
            status = 'PENDING';
        }
        // Process Checks
        if (checksRes && checksRes.check_runs) {
            for (const run of checksRes.check_runs) {
                if (run.conclusion === 'failure' || run.conclusion === 'timed_out') {
                    status = 'FAILURE';
                    failures.push(run.name);
                }
                else if (run.status === 'in_progress' || run.status === 'queued') {
                    if (status !== 'FAILURE')
                        status = 'PENDING';
                }
            }
        }
        return { status, failing: failures };
    }
    catch (error) {
        console.error(`Failed to fetch checks for ref ${ref}`);
        return { status: 'MISSING', failing: [] };
    }
}
function getMockPRs() {
    return [
        {
            number: 101, title: 'feat: add new ingestion pipeline', user: { login: 'dev-1' },
            labels: [{ name: 'feature' }], created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
            updated_at: new Date().toISOString(), mergeable_state: 'clean',
            changed_files: 12, additions: 500, deletions: 20,
            base: { ref: 'main' }, head: { ref: 'feat/ingestion', sha: 'mocksha1' }
        },
        {
            number: 102, title: 'fix: security policy bypass', user: { login: 'sec-eng' },
            labels: [{ name: 'security' }], created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
            updated_at: new Date().toISOString(), mergeable_state: 'dirty',
            changed_files: 5, additions: 50, deletions: 10,
            base: { ref: 'main' }, head: { ref: 'fix/security', sha: 'mocksha2' }
        },
        {
            number: 103, title: 'chore: update deps', user: { login: 'bot' },
            labels: [{ name: 'dependencies' }], created_at: new Date(Date.now() - 3600000).toISOString(),
            updated_at: new Date().toISOString(), mergeable_state: 'clean',
            changed_files: 2, additions: 1000, deletions: 1000,
            base: { ref: 'main' }, head: { ref: 'chore/deps', sha: 'mocksha3' }
        }
    ];
}
async function analyze() {
    console.log(`Starting PR Triage for ${OWNER}/${REPO}...`);
    const rawPrs = await fetchOpenPRs();
    const processedPrs = [];
    const fileMap = new Map(); // filename -> list of PR numbers
    // 1. Gather Data & Map Files
    for (const pr of rawPrs) {
        // If mock, simulate files
        let files = [];
        if (!GITHUB_TOKEN) {
            if (pr.number === 101)
                files = ['server/src/ingestion.ts', 'package.json'];
            if (pr.number === 102)
                files = ['policy/access.rego', 'server/src/ingestion.ts']; // Overlap
            if (pr.number === 103)
                files = ['pnpm-lock.yaml'];
        }
        else {
            files = await fetchPRFiles(pr.number);
        }
        // Map overlaps
        for (const file of files) {
            const list = fileMap.get(file) || [];
            list.push(pr.number);
            fileMap.set(file, list);
        }
        // Get Checks
        let checks = { status: 'MISSING', failing: [] };
        if (!GITHUB_TOKEN) {
            if (pr.number === 102)
                checks = { status: 'FAILURE', failing: ['Security Scan'] };
            else
                checks = { status: 'SUCCESS', failing: [] };
        }
        else {
            checks = await fetchPRChecks(pr.head.sha);
        }
        processedPrs.push({
            number: pr.number,
            title: pr.title,
            author: pr.user.login,
            labels: pr.labels.map((l) => l.name),
            createdAt: pr.created_at,
            updatedAt: pr.updated_at,
            mergeableState: pr.mergeable_state || 'unknown',
            filesChanged: pr.changed_files || files.length,
            additions: pr.additions || 0,
            deletions: pr.deletions || 0,
            baseRefName: pr.base.ref,
            headRefName: pr.head.ref,
            ci: {
                status: checks.status,
                failingChecks: checks.failing,
                details: checks.failing.length > 0 ? checks.failing.join(', ') : 'All passed'
            },
            riskScore: 0,
            factorBreakdown: [],
            overlap: {
                files: files,
                count: 0,
                overlappingPrs: []
            },
            recommendedAction: 'HOLD'
        });
    }
    // 2. Calculate Overlaps & Hotspots
    const hotspots = [];
    for (const [file, prs] of fileMap.entries()) {
        if (prs.length > 1) {
            hotspots.push({ path: file, overlapCount: prs.length, prs });
            // Update PR overlap stats
            for (const prNum of prs) {
                const pr = processedPrs.find(p => p.number === prNum);
                if (pr) {
                    pr.overlap.count++;
                    // Add other PRs to this PR's overlapping list
                    prs.forEach(other => {
                        if (other !== prNum && !pr.overlap.overlappingPrs.includes(other)) {
                            pr.overlap.overlappingPrs.push(other);
                        }
                    });
                }
            }
        }
    }
    // Sort hotspots
    hotspots.sort((a, b) => b.overlapCount - a.overlapCount);
    // 3. Score PRs
    for (const pr of processedPrs) {
        let score = 0;
        const factors = [];
        // Factor: CI Status
        if (pr.ci.status === 'FAILURE') {
            score += 40;
            factors.push('CI Failure (+40)');
        }
        else if (pr.ci.status === 'MISSING') {
            score += 20;
            factors.push('CI Missing (+20)');
        }
        // Factor: Mergeable State
        if (pr.mergeableState === 'dirty') {
            score += 30;
            factors.push('Merge Conflict (+30)');
        }
        // Factor: Overlaps
        if (pr.overlap.count > 0) {
            const penalty = Math.min(30, pr.overlap.count * 10);
            score += penalty;
            factors.push(`File Overlaps (${pr.overlap.count}) (+${penalty})`);
        }
        // Factor: Critical Paths
        const touchesCritical = pr.overlap.files.some(f => CRITICAL_PATHS.some(cp => f.startsWith(cp)));
        if (touchesCritical) {
            score += 15;
            factors.push('Touches Critical Path (+15)');
        }
        // Factor: Size
        if (pr.filesChanged > 50) {
            score += 10;
            factors.push('Large Diff (>50 files) (+10)');
        }
        // Factor: Age (Staleness)
        const daysOld = (Date.now() - new Date(pr.updatedAt).getTime()) / (1000 * 3600 * 24);
        if (daysOld > 7) {
            score += 10;
            factors.push(`Stale (>7 days) (+10)`);
        }
        pr.riskScore = Math.min(100, score);
        pr.factorBreakdown = factors;
        // Determine Action
        if (pr.riskScore >= 80)
            pr.recommendedAction = 'HOLD';
        else if (pr.mergeableState === 'dirty')
            pr.recommendedAction = 'NEEDS_REBASE';
        else if (pr.ci.status === 'FAILURE')
            pr.recommendedAction = 'NEEDS_FIX';
        else if (pr.riskScore > 40)
            pr.recommendedAction = 'NEEDS_REVIEW';
        else
            pr.recommendedAction = 'MERGE_NOW';
    }
    // --- Agentic Triage Ready Queue ---
    if (process.argv.includes('--ready')) {
        console.log('📋 Generating Agentic Triage Ready Queue...');
        // Load Worklist
        let worklist = [];
        const worklistPath = path_1.default.join(process.cwd(), 'ops/comet_v2/worklist.json');
        if (fs_1.default.existsSync(worklistPath)) {
            try {
                worklist = JSON.parse(fs_1.default.readFileSync(worklistPath, 'utf-8'));
            }
            catch (e) {
                console.warn('⚠️ Could not parse worklist.json');
            }
        }
        // Helper to get score
        const getScore = (pr) => {
            const labels = pr.labels.map((l) => l.toLowerCase());
            if (labels.includes('comet_v2_triage')) {
                const item = worklist.find((w) => w.pr_number === pr.number);
                return item ? item.score : 0;
            }
            if (labels.includes('websocket_metrics')) {
                if (labels.includes('metrics-failed'))
                    return 100; // High priority
                return 1;
            }
            return 0;
        };
        const readyQueue = processedPrs.filter(pr => {
            const labels = pr.labels.map((l) => l.toLowerCase());
            return labels.includes('comet_v2_triage') || labels.includes('websocket_metrics');
        }).sort((a, b) => {
            return getScore(b) - getScore(a);
        });
        console.log('\n## 🚀 Ready Queue\n');
        if (readyQueue.length === 0) {
            console.log('_No items in ready queue._');
        }
        else {
            console.log('| PR | Initiative | Priority/Score | Status |');
            console.log('|----|------------|----------------|--------|');
            readyQueue.forEach(pr => {
                const labels = pr.labels.map((l) => l.toLowerCase());
                let initiative = 'Unknown';
                let priority = 'Normal';
                let statusText = '';
                if (labels.includes('comet_v2_triage')) {
                    initiative = 'Comet v2';
                    const item = worklist.find((w) => w.pr_number === pr.number);
                    if (item) {
                        priority = `Score ${item.score}`;
                        statusText = item.status_text;
                    }
                    else {
                        priority = 'Score 0';
                        statusText = 'Unknown';
                    }
                }
                else if (labels.includes('websocket_metrics')) {
                    initiative = 'WebSocket';
                    if (labels.includes('metrics-failed'))
                        priority = '🔴 Metrics Failed';
                    else
                        priority = '🟢 Normal';
                }
                const row = `| #${pr.number} ${pr.title} | ${initiative} | ${priority} ${statusText ? '(' + statusText + ')' : ''} | ${pr.ci.status} |`;
                console.log(row);
            });
        }
        return;
    }
    // ----------------------------------
    // 4. Generate Merge Train
    const mergeTrain = processedPrs
        .filter(p => p.recommendedAction === 'MERGE_NOW' || p.recommendedAction === 'NEEDS_REVIEW')
        .sort((a, b) => a.riskScore - b.riskScore)
        .map(p => ({
        prNumber: p.number,
        riskScore: p.riskScore,
        rationale: `Risk: ${p.riskScore}. ${p.factorBreakdown.join(', ')}`
    }));
    // 5. Output
    const report = {
        generatedAt: new Date().toISOString(),
        baseBranch: 'main',
        prs: processedPrs,
        mergeTrain,
        hotspots: hotspots.slice(0, 10) // Top 10
    };
    // Write JSON
    if (!fs_1.default.existsSync(OUTPUT_DIR)) {
        fs_1.default.mkdirSync(OUTPUT_DIR, { recursive: true });
    }
    fs_1.default.writeFileSync(path_1.default.join(OUTPUT_DIR, 'PR_TRIAGE_REPORT.json'), JSON.stringify(report, null, 2));
    // Write Markdown
    const mdContent = generateMarkdown(report);
    fs_1.default.writeFileSync(path_1.default.join(OUTPUT_DIR, 'PR_TRIAGE_REPORT.md'), mdContent);
    console.log(`✅ Triage complete. Report saved to ${OUTPUT_DIR}/PR_TRIAGE_REPORT.md`);
}
function generateMarkdown(report) {
    return `# 🚦 PR Queue Stabilizer Report

**Generated At:** ${report.generatedAt}
**Base Branch:** ${report.baseBranch}
**Total Open PRs:** ${report.prs.length}

## 🚂 Recommended Merge Train
| Order | PR | Risk | Rationale |
|-------|----|------|-----------|
${report.mergeTrain.map((item, idx) => `| ${idx + 1} | #${item.prNumber} | ${item.riskScore} | ${item.rationale} |`).join('\n')}

${report.mergeTrain.length === 0 ? '_No PRs currently recommended for immediate merge._' : ''}

## 🔥 Conflict Hotspots
Files modified by multiple PRs. Merging one will likely conflict others.

| File | Overlap Count | PRs |
|------|---------------|-----|
${report.hotspots.map(h => `| \`${h.path}\` | ${h.overlapCount} | ${h.prs.map(p => `#${p}`).join(', ')} |`).join('\n')}

## 📋 Full PR Inventory

### High Risk / Blocked (Action: HOLD / FIX)
${renderPRTable(report.prs.filter(p => p.riskScore >= 50))}

### Medium Risk (Action: REVIEW / REBASE)
${renderPRTable(report.prs.filter(p => p.riskScore >= 20 && p.riskScore < 50))}

### Low Risk (Action: MERGE)
${renderPRTable(report.prs.filter(p => p.riskScore < 20))}

---
*Generated by PR Queue Stabilizer v1*
`;
}
function renderPRTable(prs) {
    if (prs.length === 0)
        return '_None_';
    return `
| PR | Action | Risk | CI | Factors |
|----|--------|------|----|---------|
${prs.map(p => `| #${p.number} ${p.title} | **${p.recommendedAction}** | ${p.riskScore} | ${p.ci.status} | ${p.factorBreakdown.join('<br>')} |`).join('\n')}
`;
}
analyze().catch(err => {
    console.error(err);
    process.exit(1);
});
