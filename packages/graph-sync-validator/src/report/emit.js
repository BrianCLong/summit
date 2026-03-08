"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createReport = createReport;
const crypto_1 = require("crypto");
function createReport(runId, findings, autofixPlan, metrics) {
    // Sort findings for determinism
    const sortedFindings = [...findings].sort((a, b) => {
        if (a.kind !== b.kind)
            return a.kind.localeCompare(b.kind);
        // Type narrowing
        const idA = 'id' in a ? a.id : a.fromId;
        const idB = 'id' in b ? b.id : b.fromId;
        if (idA !== idB)
            return idA.localeCompare(idB);
        if (a.kind === 'PROP_MISMATCH' && b.kind === 'PROP_MISMATCH') {
            return a.prop.localeCompare(b.prop);
        }
        return 0;
    });
    const totals = findings.reduce((acc, f) => {
        acc[f.kind] = (acc[f.kind] || 0) + 1;
        return acc;
    }, {});
    const baseReport = {
        runId,
        selectorsVersion: 'v1',
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        totals,
        findings: sortedFindings,
        autofixPlan,
        metrics,
        deterministicHash: ''
    };
    // Compute hash on stable content (excluding transient fields like runId, timestamps, duration)
    const contentToHash = {
        selectorsVersion: baseReport.selectorsVersion,
        findings: baseReport.findings,
        autofixPlan: baseReport.autofixPlan,
        metrics: {
            scannedRows: metrics.scannedRows,
            scannedNodes: metrics.scannedNodes,
            scannedRels: metrics.scannedRels
            // exclude durationMs
        }
    };
    const json = JSON.stringify(contentToHash);
    baseReport.deterministicHash = (0, crypto_1.createHash)('sha256').update(json).digest('hex');
    return baseReport;
}
