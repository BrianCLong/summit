"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_crypto_1 = __importDefault(require("node:crypto"));
const node_child_process_1 = require("node:child_process");
const ajv_1 = __importDefault(require("ajv"));
const ajv_formats_1 = __importDefault(require("ajv-formats"));
const getGitSha = () => {
    try {
        return (0, node_child_process_1.execSync)('git rev-parse HEAD').toString().trim();
    }
    catch (e) {
        return 'dev';
    }
};
const SHA = process.env.GITHUB_SHA || getGitSha();
const ARTIFACTS_DIR = process.env.ARTIFACTS_DIR || `artifacts/evidence/post-deploy/${SHA}`;
const EVIDENCE_FILE = node_path_1.default.join(ARTIFACTS_DIR, 'evidence.json');
const CHECKSUM_FILE = node_path_1.default.join(ARTIFACTS_DIR, 'checksums.txt');
const SCHEMA_FILE = node_path_1.default.resolve('docs/evidence/schema/post_deploy_evidence.schema.json');
function verifyEvidence() {
    console.log(`Verifying evidence in ${ARTIFACTS_DIR}...`);
    if (!node_fs_1.default.existsSync(EVIDENCE_FILE)) {
        console.error(`Evidence file missing: ${EVIDENCE_FILE}`);
        process.exit(1);
    }
    const evidenceContent = node_fs_1.default.readFileSync(EVIDENCE_FILE, 'utf-8');
    const evidence = JSON.parse(evidenceContent);
    // 1. Checksum Verification
    if (node_fs_1.default.existsSync(CHECKSUM_FILE)) {
        const checksumContent = node_fs_1.default.readFileSync(CHECKSUM_FILE, 'utf-8').trim();
        const parts = checksumContent.split(/\s+/);
        const expectedHash = parts[0];
        const actualHash = node_crypto_1.default.createHash('sha256').update(evidenceContent).digest('hex');
        if (actualHash !== expectedHash) {
            console.error(`Checksum mismatch! Expected: ${expectedHash}, Actual: ${actualHash}`);
            process.exit(1);
        }
        console.log("Checksum verified.");
    }
    else {
        console.warn("Checksum file missing, skipping checksum verification.");
    }
    // 2. Schema Validation
    if (!node_fs_1.default.existsSync(SCHEMA_FILE)) {
        console.error(`Schema file missing: ${SCHEMA_FILE}`);
        process.exit(1);
    }
    const schema = JSON.parse(node_fs_1.default.readFileSync(SCHEMA_FILE, 'utf-8'));
    const ajv = new ajv_1.default();
    (0, ajv_formats_1.default)(ajv);
    const validate = ajv.compile(schema);
    const valid = validate(evidence);
    if (!valid) {
        console.error("Schema validation failed:", validate.errors);
        process.exit(1);
    }
    console.log("Schema validation passed.");
    // 3. Logic Validation (pass/fail)
    if (evidence.canary.overall_status !== 'pass') {
        console.error("Canary status is FAIL.");
        process.exit(1);
    }
    console.log("Verification SUCCESS.");
}
verifyEvidence();
