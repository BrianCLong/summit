"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const MANIFEST_FILE = 'certification_manifest.json';
function log(message, type = 'INFO') {
    const color = {
        INFO: '\x1b[34m', // Blue
        PASS: '\x1b[32m', // Green
        FAIL: '\x1b[31m', // Red
        WARN: '\x1b[33m', // Yellow
    }[type];
    const reset = '\x1b[0m';
    console.log(`${color}[${type}]${reset} ${message}`);
}
function verifyFileExists(filePath) {
    try {
        return node_fs_1.default.existsSync(filePath);
    }
    catch (err) {
        return false;
    }
}
async function verifySignature(filePath) {
    // Placeholder for actual signature verification (e.g., using cosign or gpg)
    // For now, we check if a .sig file exists
    return verifyFileExists(`${filePath}.sig`);
}
async function verifyConformance(targetDir) {
    const manifestPath = node_path_1.default.join(targetDir, MANIFEST_FILE);
    if (!verifyFileExists(manifestPath)) {
        log(`Manifest not found at ${manifestPath}`, 'FAIL');
        process.exit(1);
    }
    let manifest;
    try {
        const data = node_fs_1.default.readFileSync(manifestPath, 'utf-8');
        manifest = JSON.parse(data);
        log(`Loaded manifest for ${manifest.entityName} (${manifest.level})`, 'INFO');
    }
    catch (err) {
        log(`Failed to parse manifest: ${err.message}`, 'FAIL');
        process.exit(1);
    }
    let allPassed = true;
    log(`Verifying ${manifest.evidence.length} evidence items...`, 'INFO');
    for (const item of manifest.evidence) {
        const evidencePath = node_path_1.default.join(targetDir, item.path);
        // Check 1: Existence
        if (!verifyFileExists(evidencePath)) {
            log(`[${item.id}] Missing evidence file: ${item.path}`, 'FAIL');
            allPassed = false;
            continue;
        }
        // Check 2: Type-specific checks
        if (item.type === 'signature') {
            // specific check for signature files being present or valid
            // For this MVP, we just checked existence of the file pointed to by 'path'
            // But usually signature implies verifying the signature against another file.
            // Let's assume 'path' is the signature itself for now, or the file being signed.
            // Refined logic: If type is signature, we look for a .sig file if path is the artifact
            // OR we assume path IS the signature. Let's assume path is the artifact and we look for .sig
            const hasSig = await verifySignature(evidencePath);
            if (!hasSig) {
                log(`[${item.id}] Missing signature for: ${item.path}`, 'FAIL');
                allPassed = false;
                continue;
            }
        }
        log(`[${item.id}] Verified: ${item.description}`, 'PASS');
    }
    if (allPassed) {
        log(`Conformance verification SUCCESS for ${manifest.entityName}`, 'PASS');
        process.exit(0);
    }
    else {
        log(`Conformance verification FAILED for ${manifest.entityName}`, 'FAIL');
        process.exit(1);
    }
}
// CLI Entry Point
const target = process.argv[2] || '.';
verifyConformance(target).catch(err => {
    console.error(err);
    process.exit(1);
});
