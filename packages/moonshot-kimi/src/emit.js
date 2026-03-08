"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitEvidence = emitEvidence;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function emitEvidence(evidenceId, data, baseDir = "evidence") {
    const dir = path_1.default.join(baseDir, evidenceId);
    if (!fs_1.default.existsSync(dir)) {
        fs_1.default.mkdirSync(dir, { recursive: true });
    }
    const artifacts = [];
    // Write Metrics (first so we can list it in report)
    const metricsPath = path_1.default.join(dir, "metrics.json");
    fs_1.default.writeFileSync(metricsPath, JSON.stringify(data.metrics, null, 2));
    artifacts.push(metricsPath);
    // Write Stamp
    const stampPath = path_1.default.join(dir, "stamp.json");
    const stamp = data.stamp ?? { timestamp: new Date().toISOString() };
    fs_1.default.writeFileSync(stampPath, JSON.stringify(stamp, null, 2));
    artifacts.push(stampPath);
    // Write Report
    const reportPath = path_1.default.join(dir, "report.json");
    const report = {
        evidence_id: evidenceId,
        ...data.report,
        artifacts
    };
    fs_1.default.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    // Update Index
    updateIndex(evidenceId, reportPath, metricsPath, stampPath, baseDir);
}
function updateIndex(evidenceId, reportPath, metricsPath, stampPath, baseDir) {
    const indexPath = path_1.default.join(baseDir, "index.json");
    let index = { items: [] };
    if (fs_1.default.existsSync(indexPath)) {
        try {
            index = JSON.parse(fs_1.default.readFileSync(indexPath, "utf-8"));
        }
        catch (e) {
            // Ignore corrupted index
        }
    }
    const item = {
        evidence_id: evidenceId,
        report: reportPath,
        metrics: metricsPath,
        stamp: stampPath
    };
    const existingIdx = index.items.findIndex((i) => i.evidence_id === evidenceId);
    if (existingIdx >= 0) {
        index.items[existingIdx] = item;
    }
    else {
        index.items.push(item);
    }
    fs_1.default.writeFileSync(indexPath, JSON.stringify(index, null, 2));
}
