"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_url_1 = require("node:url");
const __filename = (0, node_url_1.fileURLToPath)(import.meta.url);
const __dirname = node_path_1.default.dirname(__filename);
const REPO_ROOT = node_path_1.default.resolve(__dirname, '../../');
const CRITICAL_FILES = [
    'scripts/agentic_policy/config.json',
    'scripts/agentic_policy/agentic_plan_gate.ts',
    '.github/workflows/agentic-plan-gate.yml',
    'docs/standards/on-programming-with-agents.md'
];
function checkFiles() {
    let missing = [];
    for (const file of CRITICAL_FILES) {
        if (!node_fs_1.default.existsSync(node_path_1.default.join(REPO_ROOT, file))) {
            missing.push(file);
        }
    }
    return missing;
}
function checkConfig() {
    const configPath = node_path_1.default.join(REPO_ROOT, 'scripts/agentic_policy/config.json');
    if (node_fs_1.default.existsSync(configPath)) {
        try {
            const config = JSON.parse(node_fs_1.default.readFileSync(configPath, 'utf-8'));
            if (config.mode === 'off') {
                return 'Config mode is OFF';
            }
        }
        catch (e) {
            return 'Config is invalid JSON';
        }
    }
    return null;
}
function main() {
    console.log('Starting Agentic Policy Drift Check...');
    const missingFiles = checkFiles();
    if (missingFiles.length > 0) {
        console.error('DRIFT DETECTED: Missing critical files:', missingFiles);
        process.exit(1);
    }
    const configError = checkConfig();
    if (configError) {
        console.error('DRIFT DETECTED: Config issue:', configError);
        process.exit(1);
    }
    console.log('Policy is active and intact.');
    // Emit artifact for evidence
    const artifactPath = node_path_1.default.join(REPO_ROOT, 'artifacts/agentic_policy/drift_report.json');
    // Ensure dir exists
    const artifactDir = node_path_1.default.dirname(artifactPath);
    if (!node_fs_1.default.existsSync(artifactDir)) {
        node_fs_1.default.mkdirSync(artifactDir, { recursive: true });
    }
    node_fs_1.default.writeFileSync(artifactPath, JSON.stringify({
        status: 'pass',
        timestamp: new Date().toISOString(),
        checked_files: CRITICAL_FILES
    }, null, 2));
}
main();
