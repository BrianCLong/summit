
/**
 * Summit Offline Evidence Verifier
 * 
 * This script is designed to be run by auditors in an air-gapped or restricted environment.
 * It has ZERO dependencies on external packages (npm, pnpm, etc.) and uses only standard Node.js libraries.
 * 
 * Usage: node verify_evidence_bundle_offline.mjs <optional_path_to_artifacts_dir>
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

// --- Configuration ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_ARTIFACTS_DIR = path.resolve(__dirname, '../../artifacts');

// Allow passing directory as argument, or env var, or default
const TARGET_DIR = process.argv[2]
    ? path.resolve(process.argv[2])
    : (process.env.ARTIFACTS_DIR ? path.resolve(process.env.ARTIFACTS_DIR) : DEFAULT_ARTIFACTS_DIR);

const EVIDENCE_DIR = path.join(TARGET_DIR, 'evidence');
const MANIFEST_PATH = path.join(EVIDENCE_DIR, 'evidence-manifest.json');

// --- Helpers ---
const red = (text) => `\x1b[31m${text}\x1b[0m`;
const green = (text) => `\x1b[32m${text}\x1b[0m`;
const yellow = (text) => `\x1b[33m${text}\x1b[0m`;
const cyan = (text) => `\x1b[36m${text}\x1b[0m`;

const fail = (msg) => {
    console.error(`\n${red('⛔ VERIFICATION FAILED')}: ${msg}`);
    process.exit(1);
};

// --- Main ---
console.log(cyan('=================================================='));
console.log(cyan('      Summit Offline Evidence Verifier v1.0       '));
console.log(cyan('=================================================='));
console.log(`\n📂 Target Directory: ${TARGET_DIR}`);

if (!fs.existsSync(MANIFEST_PATH)) {
    fail(`Manifest not found at ${MANIFEST_PATH}.\nAre you pointing to the correct artifacts root?`);
}

try {
    const manifestContent = fs.readFileSync(MANIFEST_PATH, 'utf-8');
    const manifest = JSON.parse(manifestContent);
    const filesMap = manifest.files;
    let errorCount = 0;

    console.log(`\n📋 Bundle Metadata:`);
    console.log(`   - Timestamp: ${manifest.meta.timestamp}`);
    console.log(`   - Git SHA:   ${manifest.meta.gitSha}`);
    console.log(`   - Builder:   ${manifest.meta.builder}`);

    // Simulate Signature Check
    if (manifest.signature) {
        console.log(`   - Signature: ${green('PRESENT')} (Verification pending key availability)`);
    } else {
        console.log(`   - Signature: ${yellow('MISSING')}`);
    }

    console.log(`\n🕵️‍♀️  Verifying ${Object.keys(filesMap).length} artifacts...`);
    console.log('--------------------------------------------------');

    for (const [relativePath, metadata] of Object.entries(filesMap)) {
        const fullPath = path.join(TARGET_DIR, relativePath);

        process.stdout.write(`Checking ${relativePath}... `);

        if (!fs.existsSync(fullPath)) {
            console.log(red('MISSING'));
            errorCount++;
            continue;
        }

        const fileBuffer = fs.readFileSync(fullPath);
        const hashSum = crypto.createHash('sha256');
        hashSum.update(fileBuffer);
        const currentHash = hashSum.digest('hex');

        if (currentHash !== metadata.sha256) {
            console.log(red('HASH MISMATCH'));
            console.log(`   Expected: ${metadata.sha256}`);
            console.log(`   Actual:   ${currentHash}`);
            errorCount++;
        } else {
            console.log(green('OK'));
        }
    }

    console.log('--------------------------------------------------');

    if (errorCount > 0) {
        fail(`${errorCount} artifact(s) failed verification.`);
    } else {
        console.log(green('\n✅ VERIFICATION SUCCESSFUL'));
        console.log('All artifacts match the manifest integrity checks.');
        process.exit(0);
    }

} catch (error) {
    fail(`Runtime error: ${error.message}`);
}
