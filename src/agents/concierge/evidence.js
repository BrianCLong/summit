"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeEvidenceBundle = void 0;
const promises_1 = require("node:fs/promises");
const node_path_1 = __importDefault(require("node:path"));
const ensureMatchingIdentity = (bundle) => {
    const { evidenceId, runId } = bundle.report;
    if (bundle.metrics.evidenceId !== evidenceId) {
        throw new Error('EvidenceMetrics.evidenceId must match EvidenceReport.evidenceId.');
    }
    if (bundle.stamp.evidenceId !== evidenceId) {
        throw new Error('EvidenceStamp.evidenceId must match EvidenceReport.evidenceId.');
    }
    if (bundle.metrics.runId !== runId) {
        throw new Error('EvidenceMetrics.runId must match EvidenceReport.runId.');
    }
    if (bundle.stamp.runId !== runId) {
        throw new Error('EvidenceStamp.runId must match EvidenceReport.runId.');
    }
    if (!bundle.stamp.createdAtIso) {
        throw new Error('EvidenceStamp.createdAtIso is required and must be caller-provided.');
    }
};
const writeEvidenceBundle = async (baseDir, bundle) => {
    ensureMatchingIdentity(bundle);
    const runDir = node_path_1.default.join(baseDir, bundle.report.runId);
    await (0, promises_1.mkdir)(runDir, { recursive: true });
    const reportPath = node_path_1.default.join(runDir, 'report.json');
    const metricsPath = node_path_1.default.join(runDir, 'metrics.json');
    const stampPath = node_path_1.default.join(runDir, 'stamp.json');
    await (0, promises_1.writeFile)(reportPath, JSON.stringify(bundle.report, null, 2));
    await (0, promises_1.writeFile)(metricsPath, JSON.stringify(bundle.metrics, null, 2));
    await (0, promises_1.writeFile)(stampPath, JSON.stringify(bundle.stamp, null, 2));
    return {
        report: reportPath,
        metrics: metricsPath,
        stamp: stampPath,
    };
};
exports.writeEvidenceBundle = writeEvidenceBundle;
