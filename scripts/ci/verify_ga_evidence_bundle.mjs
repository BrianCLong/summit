#!/usr/bin/env node

/**
 * verify_ga_evidence_bundle.mjs
 * 
 * Strict verifier for GA-grade Evidence Bundles.
 * Validates:
 * 1. Existence of core artifacts (manifest, contents, readme).
 * 2. Manifest schema and data consistency.
 * 3. File integrity via SHA-256 (bundle.contents.txt).
 * 4. Cross-reference of manifest evidence_items with contents list.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const USAGE = `
Usage: node verify_ga_evidence_bundle.mjs <bundle-dir> [--strict]
`;

const log = {
    info: (msg) => console.log(`[INFO] ${msg}`),
    success: (msg) => console.log(`\x1b[32m[PASS] ${msg}\x1b[0m`),
    warn: (msg) => console.warn(`\x1b[33m[WARN] ${msg}\x1b[0m`),
    error: (msg) => console.error(`\x1b[31m[FAIL] ${msg}\x1b[0m`),
};

// --- Utilities ---

function hashFile(filePath) {
    const buffer = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(buffer).digest('hex');
}

// --- Verification Steps ---

function verifyBundle(bundleDir) {
    log.info(`Verifying GA Evidence Bundle at: ${bundleDir}`);

    if (!fs.existsSync(bundleDir)) {
        log.error(`Bundle directory not found: ${bundleDir}`);
        process.exit(1);
    }

    const manifestPath = path.join(bundleDir, 'bundle.manifest.json');
    const contentsPath = path.join(bundleDir, 'bundle.contents.txt');

    // 1. Basic Existence
    if (!fs.existsSync(manifestPath)) {
        log.error('Missing bundle.manifest.json');
        process.exit(1);
    }
    if (!fs.existsSync(contentsPath)) {
        log.error('Missing bundle.contents.txt');
        process.exit(1);
    }

    // 2. Manifest Validation
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    const requiredFields = ['version', 'commit_sha', 'evidence_items'];
    for (const field of requiredFields) {
        if (!manifest[field]) {
            log.error(`Manifest missing required field: ${field}`);
            process.exit(1);
        }
    }
    log.success('Manifest schema: OK');

    // 3. File Integrity (sha256sum -c style)
    const contentsRows = fs.readFileSync(contentsPath, 'utf8').trim().split('\n');
    const contentsMap = new Map();

    log.info(`Verifying ${contentsRows.length} files in contents listing...`);
    for (const row of contentsRows) {
        const [expectedHash, ...nameParts] = row.split(/\s+/);
        const fileName = nameParts.join(' ');
        const filePath = path.join(bundleDir, fileName);

        if (!fs.existsSync(filePath)) {
            log.error(`File listed in contents not found: ${fileName}`);
            process.exit(1);
        }

        const actualHash = hashFile(filePath);
        if (actualHash !== expectedHash) {
            log.error(`Hash mismatch for ${fileName}`);
            log.error(`  Expected: ${expectedHash}`);
            log.error(`  Actual:   ${actualHash}`);
            process.exit(1);
        }
        contentsMap.set(fileName, expectedHash);
    }
    log.success('File integrity (SHA-256): OK');

    // 4. Cross-reference evidence items
    log.info('Cross-referencing manifest evidence_items...');
    for (const item of manifest.evidence_items) {
        if (!contentsMap.has(item.path)) {
            log.error(`Evidence item "${item.id}" (${item.path}) not found in bundle contents`);
            process.exit(1);
        }
        if (contentsMap.get(item.path) !== item.sha256) {
            log.error(`Hash mismatch for evidence item "${item.id}" between manifest and contents`);
            process.exit(1);
        }
    }
    log.success('Evidence items consistency: OK');

    // 5. Determinism Check (Metadata)
    // Ensure no fields like 'timestamp' at root if we want strict determinism
    if (manifest.timestamp) {
        log.warn('Manifest contains "timestamp" field - this may break determinism checks');
    }

    log.success('GA Evidence Bundle verification PASSED');
}

// --- Entry Point ---

const args = process.argv.slice(2);
const bundleDirArg = args.find(a => !a.startsWith('--'));

if (!bundleDirArg) {
    console.log(USAGE);
    process.exit(1);
}

try {
    verifyBundle(bundleDirArg);
} catch (err) {
    log.error(`Unexpected error during verification: ${err.message}`);
    process.exit(1);
}
