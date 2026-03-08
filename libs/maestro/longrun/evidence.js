"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeEvidenceManifest = exports.recordIteration = exports.createEvidenceManifest = void 0;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const stop_conditions_js_1 = require("./stop-conditions.js");
const createEvidenceManifest = (job, createdAt) => ({
    jobId: job.job_id,
    goal: job.goal,
    mode: job.mode ?? 'advisory',
    createdAt,
    updatedAt: createdAt,
    budgets: job.budgets,
    modelPolicy: job.model_policy,
    qualityGates: job.quality_gates,
    stopConditions: job.stop_conditions,
    iterations: [],
    completion: {
        status: 'in-progress',
        reason: 'not-complete',
        verified: false,
    },
});
exports.createEvidenceManifest = createEvidenceManifest;
const recordIteration = (options) => {
    const { manifest, iteration, stopDecision, checkpointPath, timestamp } = options;
    manifest.iterations.push({
        iteration: iteration.iteration,
        timestamp,
        metrics: iteration.metrics,
        diffSummary: iteration.diffSummary,
        planStatus: iteration.planStatus,
        qualityGates: iteration.qualityGates,
        stopDecision,
        checkpointPath,
    });
    manifest.updatedAt = timestamp;
    if (stopDecision.status === 'stop') {
        const verified = (0, stop_conditions_js_1.isCompletionVerified)(iteration);
        manifest.completion = {
            status: verified ? 'completed' : 'halted',
            reason: stopDecision.reason,
            verified,
            verifiedAt: verified ? timestamp : undefined,
        };
    }
    return manifest;
};
exports.recordIteration = recordIteration;
const writeEvidenceManifest = (options) => {
    const { manifest, outputDir, jobId } = options;
    node_fs_1.default.mkdirSync(outputDir, { recursive: true });
    const target = node_path_1.default.join(outputDir, `${jobId}.manifest.json`);
    node_fs_1.default.writeFileSync(target, `${JSON.stringify(manifest, null, 2)}\n`, 'utf-8');
    return target;
};
exports.writeEvidenceManifest = writeEvidenceManifest;
