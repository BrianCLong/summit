"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_crypto_1 = __importDefault(require("node:crypto"));
// ============================================================================
// Configuration
// ============================================================================
const EVIDENCE_ROOT = 'evidence/security';
// ============================================================================
// Helpers
// ============================================================================
function computeSha256(filePath) {
    const fileBuffer = node_fs_1.default.readFileSync(filePath);
    const hashSum = node_crypto_1.default.createHash('sha256');
    hashSum.update(fileBuffer);
    return hashSum.digest('hex');
}
// ============================================================================
// Main Logic
// ============================================================================
function main() {
    console.log('Starting Security Drift Check...');
    // 1. Find latest evidence pack
    if (!node_fs_1.default.existsSync(EVIDENCE_ROOT)) {
        console.error(`No evidence packs found in ${EVIDENCE_ROOT}. Please run 'pnpm security:evidence-pack'.`);
        process.exit(1);
    }
    const packs = node_fs_1.default.readdirSync(EVIDENCE_ROOT).filter(f => node_fs_1.default.statSync(node_path_1.default.join(EVIDENCE_ROOT, f)).isDirectory());
    if (packs.length === 0) {
        console.error(`No evidence packs found in ${EVIDENCE_ROOT}. Please run 'pnpm security:evidence-pack'.`);
        process.exit(1);
    }
    // Sort by name (timestamp) descending
    packs.sort().reverse();
    const latestPack = packs[0];
    const latestPackPath = node_path_1.default.join(EVIDENCE_ROOT, latestPack);
    const indexPath = node_path_1.default.join(latestPackPath, 'index.json');
    if (!node_fs_1.default.existsSync(indexPath)) {
        console.error(`Latest pack ${latestPack} is missing index.json. Corrupt pack?`);
        process.exit(1);
    }
    console.log(`Comparing against latest evidence pack: ${latestPack}`);
    const index = JSON.parse(node_fs_1.default.readFileSync(indexPath, 'utf-8'));
    // 2. Compare Artifacts
    let driftFound = false;
    const driftDetails = [];
    for (const artifact of index.artifacts) {
        const currentPath = artifact.path; // This is relative to repo root
        if (!node_fs_1.default.existsSync(currentPath)) {
            console.warn(`[WARNING] Artifact deleted since last pack: ${currentPath}`);
            driftDetails.push(`DELETED: ${currentPath}`);
            driftFound = true;
            continue;
        }
        const currentHash = computeSha256(currentPath);
        if (currentHash !== artifact.sha256) {
            console.error(`[DRIFT] File changed: ${currentPath}`);
            driftDetails.push(`MODIFIED: ${currentPath}`);
            driftFound = true;
        }
    }
    // Check for new files in key directories?
    // The requirements say "Detect changes to key security/governance docs ... since last evidence pack".
    // If we only check files IN the pack, we miss added files.
    // We should walk the directories that are SUPPOSED to be in the pack and see if any are new.
    // The 'index.artifacts' is the source of truth for what WAS there.
    // To keep it simple and deterministic based on the requirement "Detect changes ... since last evidence pack",
    // we strictly compare the captured state.
    // However, catching NEW files is also important for "drift" in a broader sense, but might be out of scope
    // or noisy if we are just verifying the *validity* of the pack.
    // The prompt says: "If changes exist ... exit non-zero".
    // Usually this means if I run 'evidence-pack' now, would it generate a different hash for the same files? Yes.
    // I will stick to checking the files listed in the index.
    if (driftFound) {
        console.error('\nSecurity Posture Drift Detected!');
        console.error('The following artifacts have changed since the last evidence pack:');
        driftDetails.forEach(d => console.error(` - ${d}`));
        console.error('\nAction Required: Run \'pnpm security:evidence-pack\' to capture the new state and commit the evidence.');
        process.exit(1);
    }
    console.log('No drift detected. Security artifacts match the latest evidence pack.');
    process.exit(0);
}
main();
