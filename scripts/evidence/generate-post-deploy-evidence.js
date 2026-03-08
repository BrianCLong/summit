"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_crypto_1 = __importDefault(require("node:crypto"));
const node_child_process_1 = require("node:child_process");
const getGitSha = () => {
    try {
        return (0, node_child_process_1.execSync)('git rev-parse HEAD').toString().trim();
    }
    catch (e) {
        return 'dev';
    }
};
const SHA = process.env.GITHUB_SHA || getGitSha();
// Allow overriding artifact dir for testing
const ARTIFACTS_DIR = process.env.ARTIFACTS_DIR || `artifacts/evidence/post-deploy/${SHA}`;
const CANARY_FILE = node_path_1.default.join(ARTIFACTS_DIR, 'canary.json');
const SLO_FILE = node_path_1.default.join(ARTIFACTS_DIR, 'slo_snapshot.json');
const OUTPUT_FILE = node_path_1.default.join(ARTIFACTS_DIR, 'evidence.json');
const CHECKSUM_FILE = node_path_1.default.join(ARTIFACTS_DIR, 'checksums.txt');
function generateEvidence() {
    console.log(`Generating evidence in ${ARTIFACTS_DIR}...`);
    if (!node_fs_1.default.existsSync(CANARY_FILE)) {
        console.error(`Canary file not found: ${CANARY_FILE}`);
        process.exit(1);
    }
    const canaryData = JSON.parse(node_fs_1.default.readFileSync(CANARY_FILE, 'utf-8'));
    let sloData = undefined;
    if (node_fs_1.default.existsSync(SLO_FILE)) {
        try {
            sloData = JSON.parse(node_fs_1.default.readFileSync(SLO_FILE, 'utf-8'));
        }
        catch (e) {
            console.warn("Failed to parse SLO snapshot, ignoring.");
        }
    }
    const evidence = {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        commit_sha: SHA,
        canary: canaryData,
        slo_snapshot: sloData
    };
    const jsonContent = JSON.stringify(evidence, null, 2);
    node_fs_1.default.writeFileSync(OUTPUT_FILE, jsonContent);
    console.log(`Generated evidence at: ${OUTPUT_FILE}`);
    // Generate Checksum
    const hash = node_crypto_1.default.createHash('sha256').update(jsonContent).digest('hex');
    const checksumContent = `${hash}  evidence.json\n`;
    node_fs_1.default.writeFileSync(CHECKSUM_FILE, checksumContent);
    console.log(`Generated checksum at: ${CHECKSUM_FILE}`);
}
generateEvidence();
