
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
import { hashMatch } from '../ci/lib/secrets_rules.mjs';

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
const SECRETS_POLICY_PATH = path.resolve(__dirname, '../../docs/security/SECRETS_SCAN_POLICY.yml');

// --- Helpers ---
const red = (text) => `\x1b[31m${text}\x1b[0m`;
const green = (text) => `\x1b[32m${text}\x1b[0m`;
const yellow = (text) => `\x1b[33m${text}\x1b[0m`;
const cyan = (text) => `\x1b[36m${text}\x1b[0m`;

const fail = (msg) => {
    console.error(`\n${red('⛔ VERIFICATION FAILED')}: ${msg}`);
    process.exit(1);
};

const warn = (msg) => {
    console.log(`${yellow('⚠️  WARNING')}: ${msg}`);
};

const hashFile = (filePath) => {
    const fileBuffer = fs.readFileSync(filePath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    return hashSum.digest('hex');
};

const verifySecretsScanEvidence = (manifest) => {
    const secretsDir = path.join(TARGET_DIR, 'governance', 'secrets-scan', manifest.meta.gitSha);
    if (!fs.existsSync(secretsDir)) {
        warn(`Secrets scan evidence missing at ${secretsDir}`);
        return 0;
    }

    const reportPath = path.join(secretsDir, 'report.json');
    const stampPath = path.join(secretsDir, 'stamp.json');

    if (!fs.existsSync(reportPath) || !fs.existsSync(stampPath)) {
        warn(`Secrets scan report or stamp missing in ${secretsDir}`);
        return 0;
    }

    let stamp;
    try {
        stamp = JSON.parse(fs.readFileSync(stampPath, 'utf-8'));
    } catch (error) {
        warn(`Secrets scan stamp could not be parsed: ${error.message}`);
        return 1;
    }

    const reportHash = hashFile(reportPath);
    let errorCount = 0;

    if (stamp.report_hash && stamp.report_hash !== reportHash) {
        console.log(red('SECRETS REPORT HASH MISMATCH'));
        console.log(`   Expected: ${stamp.report_hash}`);
        console.log(`   Actual:   ${reportHash}`);
        errorCount += 1;
    } else {
        console.log(green('Secrets scan report hash OK'));
    }

    if (fs.existsSync(SECRETS_POLICY_PATH)) {
        try {
            const policyRaw = fs.readFileSync(SECRETS_POLICY_PATH, 'utf-8');
            const policyHash = hashMatch(policyRaw);
            if (stamp.policy_hash && stamp.policy_hash !== policyHash) {
                console.log(red('SECRETS POLICY HASH MISMATCH'));
                console.log(`   Expected: ${stamp.policy_hash}`);
                console.log(`   Actual:   ${policyHash}`);
                errorCount += 1;
            } else {
                console.log(green('Secrets scan policy hash OK'));
            }
        } catch (error) {
            warn(`Secrets scan policy validation failed: ${error.message}`);
            errorCount += 1;
        }
    } else {
        warn(`Secrets scan policy not found at ${SECRETS_POLICY_PATH}`);
    }

    return errorCount;
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

        const currentHash = hashFile(fullPath);

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

    console.log('\n🔐 Verifying secrets scan evidence...');
    errorCount += verifySecretsScanEvidence(manifest);

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
