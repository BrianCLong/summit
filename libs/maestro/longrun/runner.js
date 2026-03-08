"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LongRunJobRunner = void 0;
const node_child_process_1 = require("node:child_process");
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const budget_js_1 = require("./budget.js");
const evidence_js_1 = require("./evidence.js");
const stop_conditions_js_1 = require("./stop-conditions.js");
class LongRunJobRunner {
    workspaceRoot;
    job;
    budget;
    stopState;
    evidenceDir;
    checkpointsDir;
    manifest = (0, evidence_js_1.createEvidenceManifest)(this.job, new Date().toISOString());
    constructor(options) {
        this.workspaceRoot = options.workspaceRoot;
        this.job = options.job;
        this.budget = new budget_js_1.BudgetTracker(options.job.budgets);
        this.stopState = (0, stop_conditions_js_1.initialStopState)();
        this.evidenceDir = node_path_1.default.join(this.workspaceRoot, '.maestro', 'evidence');
        this.checkpointsDir = node_path_1.default.join(this.workspaceRoot, '.maestro', 'checkpoints', this.job.job_id);
    }
    runIteration(iteration) {
        this.budget.record(iteration.metrics);
        const checkpointPath = this.writeCheckpoint(iteration);
        const stopDecision = (0, stop_conditions_js_1.evaluateStopConditions)({
            iteration,
            state: this.stopState,
            policy: this.job.stop_conditions,
            budget: this.budget,
            workspaceRoot: this.workspaceRoot,
        });
        this.manifest = (0, evidence_js_1.recordIteration)({
            manifest: this.manifest,
            iteration,
            stopDecision,
            checkpointPath,
            timestamp: new Date().toISOString(),
        });
        (0, evidence_js_1.writeEvidenceManifest)({
            manifest: this.manifest,
            outputDir: this.evidenceDir,
            jobId: this.job.job_id,
        });
        this.createEvidenceBundle();
        return stopDecision;
    }
    writeCheckpoint(iteration) {
        const checkpointPath = node_path_1.default.join(this.checkpointsDir, String(iteration.iteration).padStart(4, '0'));
        node_fs_1.default.mkdirSync(checkpointPath, { recursive: true });
        if (iteration.planDiff) {
            node_fs_1.default.writeFileSync(node_path_1.default.join(checkpointPath, 'plan-diff.md'), iteration.planDiff, 'utf-8');
        }
        if (iteration.patch) {
            node_fs_1.default.writeFileSync(node_path_1.default.join(checkpointPath, 'patch.diff'), iteration.patch, 'utf-8');
        }
        if (iteration.commandLog) {
            node_fs_1.default.writeFileSync(node_path_1.default.join(checkpointPath, 'command.log'), `${iteration.commandLog.join('\n')}\n`, 'utf-8');
        }
        if (iteration.testReport) {
            node_fs_1.default.writeFileSync(node_path_1.default.join(checkpointPath, 'test-report.json'), `${JSON.stringify(iteration.testReport, null, 2)}\n`, 'utf-8');
        }
        if (iteration.summary) {
            node_fs_1.default.writeFileSync(node_path_1.default.join(checkpointPath, 'summary.md'), iteration.summary, 'utf-8');
        }
        return checkpointPath;
    }
    createEvidenceBundle() {
        node_fs_1.default.mkdirSync(this.evidenceDir, { recursive: true });
        const tarPath = node_path_1.default.join(this.evidenceDir, `${this.job.job_id}.tar.gz`);
        const manifestPath = node_path_1.default.join(this.evidenceDir, `${this.job.job_id}.manifest.json`);
        const tarArgs = [
            '-czf',
            tarPath,
            '-C',
            this.workspaceRoot,
            '.maestro/checkpoints',
            `.maestro/evidence/${node_path_1.default.basename(manifestPath)}`,
        ];
        const result = (0, node_child_process_1.spawnSync)('tar', tarArgs, { stdio: 'pipe' });
        if (result.status !== 0) {
            const errorLog = result.stderr?.toString() || 'unknown tar error';
            node_fs_1.default.writeFileSync(node_path_1.default.join(this.evidenceDir, `${this.job.job_id}.tar.error.log`), errorLog, 'utf-8');
        }
    }
}
exports.LongRunJobRunner = LongRunJobRunner;
