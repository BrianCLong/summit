"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("../../packages/policy-cards/src/index.js");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// Skeleton drift detector
// In a real implementation, this would fetch the "approved" hash from a registry (e.g., Neo4j, S3, or a file)
// and compare it with the current policy in the repo.
const KNOWN_POLICIES_DIR = process.env.KNOWN_POLICIES_DIR || path_1.default.join(process.cwd(), "policies");
async function main() {
    console.log("Starting Policy Drift Detection...");
    if (!fs_1.default.existsSync(KNOWN_POLICIES_DIR)) {
        console.log("No policies directory found. Skipping drift check.");
        process.exit(0);
    }
    const files = fs_1.default.readdirSync(KNOWN_POLICIES_DIR).filter(f => f.endsWith('.yaml') || f.endsWith('.json'));
    const driftReport = { timestamp: new Date().toISOString(), details: [] };
    let hasDrift = false;
    for (const file of files) {
        const filePath = path_1.default.join(KNOWN_POLICIES_DIR, file);
        const content = fs_1.default.readFileSync(filePath, 'utf-8');
        const canonical = (0, index_js_1.canonicalizePolicy)(content);
        const res = (0, index_js_1.validatePolicy)(canonical); // Gets the hash
        console.log(`Checked ${file}: Hash ${res.hash}`);
        // Simulating drift check:
        // const approvedHash = getApprovedHash(file);
        // if (res.hash !== approvedHash) { hasDrift = true; ... }
        driftReport.details.push({ file, hash: res.hash, status: "CHECKED" });
    }
    // Write drift report
    const artifactDir = process.env.ARTIFACT_DIR || path_1.default.join(process.cwd(), "artifacts", "policy");
    if (!fs_1.default.existsSync(artifactDir)) {
        fs_1.default.mkdirSync(artifactDir, { recursive: true });
    }
    fs_1.default.writeFileSync(path_1.default.join(artifactDir, "drift_report.json"), JSON.stringify(driftReport, null, 2));
    console.log("Drift check complete.");
    if (hasDrift) {
        console.error("DRIFT DETECTED!");
        process.exit(1);
    }
}
main();
