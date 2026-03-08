"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashboardRouter = void 0;
/**
 * /api/dashboard
 *
 * Aggregates branch/tag convergence data, artifact stats, and top findings.
 */
const express_1 = require("express");
const promises_1 = require("fs/promises");
const path_1 = require("path");
const config_js_1 = require("../config.js");
const git_js_1 = require("../utils/git.js");
const metrics_js_1 = require("../utils/metrics.js");
exports.dashboardRouter = (0, express_1.Router)();
async function loadArtifactStats() {
    let files;
    try {
        files = await (0, promises_1.readdir)(config_js_1.PATHS.artifactsPr);
    }
    catch {
        return { total: 0, byStatus: {}, recentConcerns: [] };
    }
    const byStatus = {};
    const concerns = [];
    let total = 0;
    for (const file of files) {
        if ((0, path_1.extname)(file) !== '.json' || file === 'schema.json')
            continue;
        try {
            const raw = await (0, promises_1.readFile)((0, path_1.join)(config_js_1.PATHS.artifactsPr, file), 'utf-8');
            const data = JSON.parse(raw);
            if (data.status) {
                byStatus[data.status] = (byStatus[data.status] ?? 0) + 1;
                total++;
            }
            if (data.concern)
                concerns.push(data.concern);
        }
        catch { /* skip */ }
    }
    return {
        total,
        byStatus: byStatus,
        recentConcerns: [...new Set(concerns)].slice(0, 10),
    };
}
function buildFindings(branches, artifactStats) {
    const findings = [];
    const quarantined = artifactStats.byStatus['quarantined'] ?? 0;
    if (quarantined > 0) {
        findings.push({ severity: 'error', source: 'artifacts', message: `${quarantined} artifact(s) in QUARANTINED state` });
    }
    const claudeBranches = branches.filter((b) => b.type === 'claude' && !b.remote);
    if (claudeBranches.length > 5) {
        findings.push({ severity: 'warning', source: 'git', message: `${claudeBranches.length} local claude/ branches open – consider merging or archiving` });
    }
    const total = branches.filter((b) => !b.remote).length;
    if (total > 20) {
        findings.push({ severity: 'warning', source: 'git', message: `${total} local branches found – high branch count may indicate stale work` });
    }
    if (findings.length === 0) {
        findings.push({ severity: 'info', source: 'dashboard', message: 'No critical findings – repo convergence looks healthy' });
    }
    return findings;
}
// GET /api/dashboard
exports.dashboardRouter.get('/', async (_req, res) => {
    (0, metrics_js_1.incCounter)('summit_ui_dashboard_total', 'Dashboard requests');
    const [rawBranches, tags, artifactStats] = await Promise.all([
        Promise.resolve((0, git_js_1.getBranches)()),
        Promise.resolve((0, git_js_1.getTags)()),
        loadArtifactStats(),
    ]);
    // Deduplicate branches (remote + local may share names)
    const seen = new Set();
    const branches = rawBranches.filter((b) => {
        const key = b.name;
        if (seen.has(key))
            return false;
        seen.add(key);
        return true;
    });
    const byType = {};
    for (const b of branches) {
        byType[b.type] = (byType[b.type] ?? 0) + 1;
    }
    const topFindings = buildFindings(rawBranches, artifactStats);
    // Update gauges for observability
    (0, metrics_js_1.setGauge)('summit_ui_branch_count', branches.length, 'Total unique branches');
    (0, metrics_js_1.setGauge)('summit_ui_tag_count', tags.length, 'Total git tags');
    (0, metrics_js_1.setGauge)('summit_ui_artifact_count', artifactStats.total, 'Total PR artifacts');
    res.json({
        branches: { total: branches.length, byType, list: branches.slice(0, 100) },
        tags: { total: tags.length, list: tags.slice(0, 50) },
        artifacts: artifactStats,
        topFindings,
        generatedAt: new Date().toISOString(),
    });
});
