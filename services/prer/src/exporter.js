"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serializeExperimentForExport = serializeExperimentForExport;
exports.createExportDigest = createExportDigest;
exports.buildExportBundle = buildExportBundle;
const crypto_1 = require("crypto");
function serializeExperimentForExport(experiment) {
    return JSON.stringify({
        id: experiment.id,
        name: experiment.name,
        hypothesis: experiment.hypothesis,
        metrics: experiment.metrics,
        stopRule: experiment.stopRule,
        analysisPlan: experiment.analysisPlan,
        powerAnalysis: experiment.powerAnalysis,
        createdAt: experiment.createdAt,
        lockedAt: experiment.lockedAt ?? null,
        status: experiment.status,
        auditLog: experiment.auditLog,
        results: experiment.results
    }, null, 2);
}
function createExportDigest(payload) {
    return (0, crypto_1.createHash)('sha256').update(payload).digest('hex');
}
function buildExportBundle(experiment) {
    const payload = serializeExperimentForExport(experiment);
    const digest = createExportDigest(payload);
    return { payload, digest };
}
