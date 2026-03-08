"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitEvidence = emitEvidence;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function emitEvidence(runId, plan, result, baseDir = 'evidence/runs') {
    const runDir = path_1.default.join(baseDir, runId);
    if (!fs_1.default.existsSync(runDir)) {
        fs_1.default.mkdirSync(runDir, { recursive: true });
    }
    const reportPath = path_1.default.join(runDir, 'report.json');
    const metricsPath = path_1.default.join(runDir, 'metrics.json');
    const stampPath = path_1.default.join(runDir, 'stamp.json');
    const report = { run_id: runId, mode: "swarm", summary: "Swarm execution completed", evidence_ids: [`EVD-KIMIK25-SWARM-RUN-${runId}`], outputs: result.outputs };
    const metrics = { run_id: runId, metrics: result.usage };
    const stamp = { run_id: runId, generated_at: new Date().toISOString() };
    fs_1.default.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    fs_1.default.writeFileSync(metricsPath, JSON.stringify(metrics, null, 2));
    fs_1.default.writeFileSync(stampPath, JSON.stringify(stamp, null, 2));
    updateIndex(`EVD-KIMIK25-SWARM-RUN-${runId}`, [reportPath, metricsPath, stampPath]);
    return runDir;
}
function updateIndex(evidenceId, files) {
    const indexPath = path_1.default.join(process.cwd(), 'evidence/index.json');
    if (fs_1.default.existsSync(indexPath)) {
        const index = JSON.parse(fs_1.default.readFileSync(indexPath, 'utf-8'));
        index.items[evidenceId] = { files: files, title: `Swarm Run ${evidenceId.slice(-8)}`, category: "runtime" };
        fs_1.default.writeFileSync(indexPath, JSON.stringify(index, null, 2));
    }
}
