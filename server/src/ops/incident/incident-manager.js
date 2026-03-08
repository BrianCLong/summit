"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IncidentManager = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
const util_1 = __importDefault(require("util"));
const execPromise = util_1.default.promisify(child_process_1.exec);
class IncidentManager {
    static instance;
    incidentsDir;
    constructor() {
        this.incidentsDir = path_1.default.resolve(process.cwd(), 'incidents');
        if (!fs_1.default.existsSync(this.incidentsDir)) {
            fs_1.default.mkdirSync(this.incidentsDir, { recursive: true });
        }
    }
    static getInstance() {
        if (!IncidentManager.instance) {
            IncidentManager.instance = new IncidentManager();
        }
        return IncidentManager.instance;
    }
    /**
     * Captures a snapshot of the system state for a given incident.
     */
    async captureSnapshot(context) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const snapshotDir = path_1.default.join(this.incidentsDir, `${context.incidentId}_${timestamp}`);
        fs_1.default.mkdirSync(snapshotDir, { recursive: true });
        const metadata = {
            ...context,
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development',
            version: process.env.npm_package_version || 'unknown'
        };
        fs_1.default.writeFileSync(path_1.default.join(snapshotDir, 'metadata.json'), JSON.stringify(metadata, null, 2));
        // Parallel capture
        await Promise.allSettled([
            this.captureEnvVars(snapshotDir),
            this.captureGitInfo(snapshotDir),
            this.captureProcessList(snapshotDir),
            this.captureMemoryUsage(snapshotDir)
        ]);
        console.log(`[IncidentManager] Snapshot captured at ${snapshotDir}`);
        return snapshotDir;
    }
    async captureEnvVars(dir) {
        // Redact sensitive keys
        const safeEnv = Object.keys(process.env).reduce((acc, key) => {
            if (key.match(/KEY|SECRET|TOKEN|PASSWORD/i)) {
                acc[key] = '***REDACTED***';
            }
            else {
                acc[key] = process.env[key];
            }
            return acc;
        }, {});
        fs_1.default.writeFileSync(path_1.default.join(dir, 'env_vars.json'), JSON.stringify(safeEnv, null, 2));
    }
    async captureGitInfo(dir) {
        try {
            const { stdout: commit } = await execPromise('git rev-parse HEAD');
            const { stdout: status } = await execPromise('git status --porcelain');
            fs_1.default.writeFileSync(path_1.default.join(dir, 'git_info.txt'), `Commit: ${commit.trim()}\n\nStatus:\n${status}`);
        }
        catch (e) {
            fs_1.default.writeFileSync(path_1.default.join(dir, 'git_info_error.txt'), `Failed to capture git info: ${e}`);
        }
    }
    async captureProcessList(dir) {
        try {
            // Basic ps command, works on Linux/Mac
            const { stdout } = await execPromise('ps aux --sort=-pcpu | head -n 20');
            fs_1.default.writeFileSync(path_1.default.join(dir, 'process_list.txt'), stdout);
        }
        catch (e) {
            fs_1.default.writeFileSync(path_1.default.join(dir, 'process_list_error.txt'), `Failed to capture process list: ${e}`);
        }
    }
    async captureMemoryUsage(dir) {
        const usage = process.memoryUsage();
        fs_1.default.writeFileSync(path_1.default.join(dir, 'memory_usage.json'), JSON.stringify(usage, null, 2));
    }
}
exports.IncidentManager = IncidentManager;
